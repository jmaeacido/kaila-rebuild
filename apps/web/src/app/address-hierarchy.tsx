"use client";

import { useMemo, useState } from "react";
import styles from "./address-hierarchy.module.css";

export type AreaReference = {
  id: number;
  parent_id: number | null;
  type?: "region" | "province" | "city" | "municipality" | "barangay";
  name: string;
};

const independentCity = "independent-city";

export function areaPathLabel(areas: AreaReference[], areaId: string): string {
  const barangay = areas.find((area) => String(area.id) === areaId);
  const city = areas.find((area) => area.id === barangay?.parent_id);
  const parent = areas.find((area) => area.id === city?.parent_id);
  const province = parent?.type === "province" ? parent.name : "Independent City";

  return [province, city?.name, barangay?.name].filter(Boolean).join(", ");
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

  const provinces = useMemo(
    () => areas.filter((area) => area.type === "province"),
    [areas],
  );
  const independentCities = useMemo(
    () =>
      areas.filter(
        (area) =>
          area.type === "city" &&
          areas.find((parent) => parent.id === area.parent_id)?.type === "region",
      ),
    [areas],
  );
  const selectedPath = useMemo(() => {
    const barangay = areas.find((area) => String(area.id) === value);
    const city = areas.find((area) => area.id === barangay?.parent_id);
    const parent = areas.find((area) => area.id === city?.parent_id);

    return {
      provinceId: parent?.type === "province" ? String(parent.id) : city ? independentCity : "",
      cityId: city ? String(city.id) : "",
    };
  }, [areas, value]);
  const effectiveProvinceId = provinceId || selectedPath.provinceId;
  const effectiveCityId = cityId || selectedPath.cityId;
  const cities = useMemo(
    () =>
      effectiveProvinceId === independentCity
        ? independentCities
        : areas.filter(
            (area) =>
              ["city", "municipality"].includes(area.type ?? "") &&
              String(area.parent_id) === effectiveProvinceId,
          ),
    [areas, effectiveProvinceId, independentCities],
  );
  const barangays = useMemo(
    () =>
      areas.filter(
        (area) => area.type === "barangay" && String(area.parent_id) === effectiveCityId,
      ),
    [areas, effectiveCityId],
  );

  function chooseProvince(next: string) {
    setProvinceId(next);
    setCityId("");
    onChange("");
  }

  function chooseCity(next: string) {
    setCityId(next);
    onChange("");
  }

  return (
    <div className={styles.fields}>
      <label>
        Province{optional && <small>Optional</small>}
        <select
          required={!optional}
          value={effectiveProvinceId}
          onChange={(event) => chooseProvince(event.target.value)}
        >
          <option value="">Choose province</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
          {independentCities.length > 0 && (
            <option value={independentCity}>Independent City</option>
          )}
        </select>
      </label>
      <label>
        City / Municipality
        <select
          required={!optional && Boolean(effectiveProvinceId)}
          disabled={!effectiveProvinceId}
          value={effectiveCityId}
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
          required={!optional && Boolean(effectiveCityId)}
          disabled={!effectiveCityId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose barangay</option>
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
