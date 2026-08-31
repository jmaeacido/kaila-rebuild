"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { AttachmentSourceActions } from "./attachment-picker";
import { prepareCsrf } from "../app/auth-client";
import styles from "./provider-portfolio-manager.module.css";

export type ManagedPortfolioAsset = {
  id: string;
  caption: string | null;
  scanStatus: string;
  downloadPath: string;
  sortOrder: number;
};

const MAX_PORTFOLIO = 12;

type ProviderPortfolioManagerProps = {
  assets: ManagedPortfolioAsset[];
  onAssetsChange: () => void;
  disabled?: boolean;
};

function scanLabel(scanStatus: string): string {
  if (scanStatus === "clean") return "Live on profile";
  if (scanStatus === "rejected") return "Not approved";
  return "In review";
}

export function ProviderPortfolioManager({
  assets,
  onAssetsChange,
  disabled = false,
}: ProviderPortfolioManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notice, setNotice] = useState("");

  const remaining = MAX_PORTFOLIO - assets.length;
  const canUpload = !disabled && remaining > 0 && !uploading;

  async function uploadFile(file: File) {
    if (!canUpload) return;
    setUploading(true);
    setUploadProgress(0);
    setNotice("");
    try {
      const token = await prepareCsrf();
      const body = new FormData();
      body.append("purpose", "portfolio");
      body.append("file", file);
      const responseStatus = await new Promise<number>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/v1/me/profile-assets");
        request.setRequestHeader("Accept", "application/json");
        if (token) request.setRequestHeader("X-XSRF-TOKEN", token);
        request.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        request.addEventListener("load", () => resolve(request.status));
        request.addEventListener("error", () => reject(new Error("upload-failed")));
        request.addEventListener("abort", () => reject(new Error("upload-failed")));
        request.send(body);
      });
      if (responseStatus < 200 || responseStatus >= 300) {
        throw new Error(responseStatus === 422 ? "invalid-file" : "upload-failed");
      }
      setNotice("Uploaded. KAILA reviews work photos before they appear on your public profile.");
      onAssetsChange();
    } catch (error) {
      setNotice(
        error instanceof Error && error.message === "invalid-file"
          ? "Use JPG, PNG, or WebP up to 10 MB."
          : "We couldn't upload that photo right now. Try again.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function removeAsset(assetId: string) {
    setNotice("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/me/profile-assets/${assetId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
      });
      if (!response.ok) throw new Error("delete-failed");
      onAssetsChange();
    } catch {
      setNotice("We couldn't remove that photo right now. Try again.");
    }
  }

  return (
    <div className={styles.root}>
      <p className={styles.help}>
        Show real examples of jobs you have finished. Clients trust providers who prove their work.
        {remaining > 0 ? ` You can add up to ${remaining} more.` : " You reached the 12-photo limit."}
      </p>
      {assets.length > 0 ? (
        <ul className={styles.grid}>
          {assets.map((asset) => (
            <li key={asset.id} className={styles.item}>
              <div className={styles.preview}>
                <Image
                  unoptimized
                  src={asset.downloadPath}
                  alt={asset.caption || "Work photo"}
                  width={320}
                  height={240}
                />
                <span
                  className={styles.badge}
                  data-status={asset.scanStatus}
                >
                  {scanLabel(asset.scanStatus)}
                </span>
              </div>
              {asset.caption ? <p className={styles.caption}>{asset.caption}</p> : null}
              <button
                type="button"
                className={styles.remove}
                data-flat-button
                onClick={() => void removeAsset(asset.id)}
                disabled={disabled}
                aria-label="Remove work photo"
              >
                <Trash2 aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No work photos yet. Add your best before-and-after shots or finished projects.</p>
      )}
      <div className={styles.actions}>
        <AttachmentSourceActions
          kinds={["image"]}
          disabled={!canUpload}
          onFiles={(files) => {
            const file = files[0];
            if (file) void uploadFile(file);
          }}
        />
        {uploading ? <p className={styles.status}>Uploading… {uploadProgress}%</p> : null}
        {notice ? <p className={styles.notice}>{notice}</p> : null}
      </div>
    </div>
  );
}
