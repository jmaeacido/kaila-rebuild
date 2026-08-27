"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./address-hierarchy.module.css";

export type AreaReference = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};

const independentLocality = "independent-city";

/** City/municipality id for a barangay or city/municipality area row. */
export function cityIdForArea(areas: AreaReference[], areaId: number | null | undefined): number | null {
  if (!areaId) return null;
  const area = areas.find((entry) => entry.id === areaId);
  if (!area) return null;
  if (area.type === "city" || area.type === "municipality") return area.id;
  if (area.type === "barangay" && area.parent_id != null) {
    const parent = areas.find((entry) => entry.id === area.parent_id);
    if (parent && (parent.type === "city" || parent.type === "municipality")) return parent.id;
  }
  return null;
}

export function areaName(areas: AreaReference[], areaId: number | null | undefined): string | null {
  if (!areaId) return null;
  return areas.find((entry) => entry.id === areaId)?.name ?? null;
}

export function areaPathLabel(areas: AreaReference[], areaId: string): string {
  const barangay = areas.find((area) => String(area.id) === areaId);
  const city = areas.find((area) => area.id === barangay?.parent_id);
  const parent = areas.find((area) => area.id === city?.parent_id);
  const province = parent?.type === "province" ? parent.name : "Independent City";

  return [province, city?.name, barangay?.name].filter(Boolean).join(", ");
}

async function fetchArea(areaId: string): Promise<AreaReference & { parent?: AreaReference | null }> {
  const response = await fetch(`/api/v1/marketplace/areas/${encodeURIComponent(areaId)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("AREA_LOOKUP_FAILED");
  return ((await response.json()) as { data: AreaReference & { parent?: AreaReference | null } }).data;
}

async function fetchChildren(parentId: string): Promise<AreaReference[]> {
  const response = await fetch(
    `/api/v1/marketplace/areas?parentId=${encodeURIComponent(parentId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("AREA_CHILDREN_FAILED");
  return ((await response.json()) as { data: AreaReference[] }).data;
}

function isRegionDirectLocality(areas: AreaReference[], area: AreaReference): boolean {
  if (!["city", "municipality"].includes(area.type ?? "")) return false;
  const parent = areas.find((entry) => entry.id === area.parent_id);
  return parent?.type === "region";
}

export function AddressHierarchy({
  areas,
  value,
  onChange,
  optional = false,
}: {
  areas: AreaReference[];
  value: string;
  onChange: (areaId: string) => void;
  optional?: boolean;
}) {
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [barangays, setBarangays] = useState<AreaReference[]>([]);
  const [loadedBarangaysCityId, setLoadedBarangaysCityId] = useState("");
  const barangaysLoading = Boolean(cityId) && loadedBarangaysCityId !== cityId;

  const provinces = useMemo(
    () => areas.filter((area) => area.type === "province"),
    [areas],
  );
  const independentLocalities = useMemo(
    () => areas.filter((area) => isRegionDirectLocality(areas, area)),
    [areas],
  );
  const cities = useMemo(
    () =>
      provinceId === independentLocality
        ? independentLocalities
        : areas.filter(
            (area) =>
              ["city", "municipality"].includes(area.type ?? "") &&
              String(area.parent_id) === provinceId,
          ),
    [areas, independentLocalities, provinceId],
  );

  useEffect(() => {
    let active = true;

    if (!value) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const selectedArea: AreaReference & { parent?: AreaReference | null } =
          areas.find((area) => String(area.id) === value) ??
          (await fetchArea(value));
        if (!active) return;

        const city = ["city", "municipality"].includes(selectedArea.type ?? "")
          ? selectedArea
          : selectedArea.type === "barangay" && selectedArea.parent_id != null
            ? selectedArea.parent &&
              ["city", "municipality"].includes(selectedArea.parent.type ?? "")
              ? selectedArea.parent
              : areas.find((area) => area.id === selectedArea.parent_id)
            : null;

        if (!city) return;

        const parent = areas.find((area) => area.id === city.parent_id);
        setProvinceId(parent?.type === "province" ? String(parent.id) : independentLocality);
        setCityId(String(city.id));
      } catch {
        // Keep the empty cascade; the caller still holds the saved value.
      }
    })();

    return () => {
      active = false;
    };
  }, [areas, value]);

  useEffect(() => {
    let active = true;

    if (!cityId) {
      return () => {
        active = false;
      };
    }

    void fetchChildren(cityId)
      .then((children) => {
        if (!active) return;
        setBarangays(children.filter((area) => area.type === "barangay"));
      })
      .catch(() => {
        if (!active) return;
        setBarangays([]);
      })
      .finally(() => {
        if (active) setLoadedBarangaysCityId(cityId);
      });

    return () => {
      active = false;
    };
  }, [cityId]);

  function chooseProvince(next: string) {
    setProvinceId(next);
    setCityId("");
    setBarangays([]);
    setLoadedBarangaysCityId("");
    onChange("");
  }

  function chooseCity(next: string) {
    setCityId(next);
    setBarangays([]);
    setLoadedBarangaysCityId("");
    onChange("");
  }

  return (
    <div className={styles.fields}>
      <label>
        Province{optional && <small>Optional</small>}
        <select
          required={!optional}
          value={provinceId}
          onChange={(event) => chooseProvince(event.target.value)}
        >
          <option value="">Choose province</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
          {independentLocalities.length > 0 && (
            <option value={independentLocality}>Independent City</option>
          )}
        </select>
      </label>
      <label>
        City / Municipality
        <select
          required={!optional && Boolean(provinceId)}
          disabled={!provinceId}
          value={cityId}
          onChange={(event) => chooseCity(event.target.value)}
        >
          <option value="">Choose city or municipality</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Barangay
        <select
          required={!optional && Boolean(cityId)}
          disabled={!cityId || barangaysLoading}
          value={barangays.some((barangay) => String(barangay.id) === value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{barangaysLoading ? "Loading barangays…" : "Choose barangay"}</option>
          {barangays.map((barangay) => (
            <option key={barangay.id} value={barangay.id}>
              {barangay.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
