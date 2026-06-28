"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const SIZES = ["4x6", "3x5", "A5", "A6"];
const TEMPLATES = [
  { id: 1, name: "Standard", desc: "Classic layout with all details" },
  { id: 2, name: "Compact", desc: "Minimal info, larger barcode" },
  { id: 3, name: "Branded", desc: "Your logo prominently displayed" },
  { id: 4, name: "COD Bold", desc: "COD amount highlighted in red" },
  { id: 5, name: "Thermal", desc: "Optimised for thermal printers" },
  { id: 6, name: "A4 Sheet", desc: "6 labels per A4 page" },
];

export default function LabelsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [couriers, setCouriers] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState("");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadImageError("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { data } = await api.post("/upload", {
            name: file.name,
            data: base64,
          });
          setSettings((p: any) => ({ ...p, label_image_url: data.url }));
        } catch (err) {
          setUploadImageError("Failed to upload image");
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadImageError("An error occurred during file selection");
      setUploadingImage(false);
    }
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const apiBase = api.defaults.baseURL?.replace("/api/v1", "") || "";
    const logoHtml =
      settings?.show_logo && settings?.logo_url
        ? `<img src="${settings.logo_url}" class="max-h-10 object-contain mb-2" />`
        : "";
    const imgHtml = settings?.label_image_url
      ? `<div class="mb-4 flex justify-center"><img src="${apiBase}${settings.label_image_url}" class="max-h-20 object-contain" /></div>`
      : "";
    const phoneHtml =
      settings?.show_mobile && settings?.phone_number
        ? `<div class="mt-0.5 font-bold">Ph: ${settings.phone_number}</div>`
        : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Mozopost Label Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { size: auto; margin: 0; }
            }
          </style>
        </head>
        <body class="bg-white flex items-center justify-center p-6">
          <div class="w-[360px] bg-white border-2 border-black p-5 font-mono text-xs text-black relative" style="min-height: 520px;">
            <div class="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
              <div>
                ${logoHtml}
                ${settings?.show_brand_name && settings?.brand_name ? `<div class="font-bold text-sm mb-1">${settings.brand_name}</div>` : ""}
                <div class="font-black text-lg tracking-wide mb-1">
                  ${(couriers.length > 0 ? couriers[0].name : "DELHIVERY").toUpperCase()}
                </div>
                <div class="text-[10px]">AWB: DEL1234567890</div>
              </div>
              <div class="bg-black text-white px-2 py-1 font-bold text-[10px]">PREPAID</div>
            </div>
            
            <div class="mb-4">
               <div class="font-bold text-[10px] mb-1">SHIP TO:</div>
               <div class="font-semibold text-sm">Rahul Sharma</div>
               <div>204 MG Road, Bengaluru 560001</div>
               <div>Ph: 9876543210</div>
            </div>
            
            ${
              settings?.show_return_addr && settings?.return_address
                ? `
               <div class="mb-4 pt-3 border-t border-black/20 text-[10px]">
                 <div class="font-bold mb-1">RETURN TO:</div>
                 <div>${settings.return_address}</div>
                 ${phoneHtml}
               </div>
            `
                : ""
            }
            
            ${imgHtml}
            
            <div class="absolute bottom-4 left-4 right-4">
               <div class="h-16 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] w-full mb-2 opacity-80"></div>
               <div class="border-t-2 border-black pt-2 flex justify-between text-[10px] font-semibold">
                 <div>Wt: 0.5kg • ORD-2026-001</div>
                 ${settings?.show_gst ? "<div>GST: 24AAAA0000A1Z5</div>" : ""}
               </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  useEffect(() => {
    Promise.all([api.get("/labels/settings"), api.get("/couriers")])
      .then(([settingsRes, couriersRes]) => {
        setSettings(settingsRes.data.settings);
        setCouriers(couriersRes.data.couriers || []);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: string) {
    setSettings((p: any) => ({ ...p, [key]: !p[key] }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch("/labels/settings", {
        showLogo: settings.show_logo,
        showBrandName: settings.show_brand_name,
        showGst: settings.show_gst,
        showReturnAddr: settings.show_return_addr,
        labelSize: settings.label_size,
        templateId: settings.template_id,
        brandName: settings.brand_name,
        returnAddress: settings.return_address,
        showMobile: settings.show_mobile,
        labelImageUrl: settings.label_image_url,
      });
      setSuccess("Label settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-sm text-[#8A9270] font-medium">
        Loading settings...
      </div>
    );

  return (
    <div className="animate-fade-up space-y-5 mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
            Label Management
          </h1>
          <p className="text-sm text-[#8A9270] mt-1">
            Customize your shipping labels and printer settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-[#EDF0E4] border border-[#CBD7B5] text-sm font-medium text-[#546B41] flex items-center gap-3">
          <span>✓</span> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Toggle options */}
          <div className="bg-white rounded-xl border border-[#EADFC8] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EADFC8] bg-[#F6EEDB]">
              <h2 className="text-xs font-bold text-[#2F3A22] uppercase tracking-wider">
                Label Content Options
              </h2>
            </div>
            <div className="divide-y divide-[#F6EEDB]">
              {[
                {
                  key: "show_brand_name",
                  label: "Show Brand Name",
                  desc: "Print your store or brand name on the label",
                },
                {
                  key: "show_logo",
                  label: "Show Brand Logo",
                  desc: "Display your store logo at the top",
                },
                {
                  key: "show_gst",
                  label: "Show GST Number",
                  desc: "Include GSTIN for B2B shipments",
                },
                {
                  key: "show_return_addr",
                  label: "Show Return Address",
                  desc: "Print return/pickup address",
                },
                {
                  key: "show_mobile",
                  label: "Show Mobile Number",
                  desc: "Print your mobile number on the label",
                },
              ].map((opt) => {
                const isActive = settings?.[opt.key];
                return (
                  <div
                    key={opt.key}
                    className="flex items-center justify-between p-4 hover:bg-[#FFF8EC]/50 transition-colors cursor-pointer"
                    onClick={() => toggle(opt.key)}
                  >
                    <div>
                      <div className="font-semibold text-xs text-[#2F3A22]">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-[#8A9270] mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                    <button
                      className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? "bg-[#546B41]" : "bg-[#E2D4B8]"}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isActive ? "left-5.5" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brand details */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EADFC8] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EADFC8] bg-[#F6EEDB]">
              <h2 className="text-sm font-bold text-[#2F3A22]">
                Brand Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
                  Brand Name
                </label>
                <input
                  className="w-full px-3 py-2.5 text-sm border border-[#EADFC8] rounded-xl bg-white text-[#2F3A22] outline-none transition-all focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
                  value={settings?.brand_name || ""}
                  onChange={(e) =>
                    setSettings((p: any) => ({
                      ...p,
                      brand_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
                  Return Address
                </label>
                <textarea
                  className="w-full px-3 py-2.5 text-sm border border-[#EADFC8] rounded-xl bg-white text-[#2F3A22] outline-none transition-all focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
                  rows={3}
                  value={settings?.return_address || ""}
                  onChange={(e) =>
                    setSettings((p: any) => ({
                      ...p,
                      return_address: e.target.value,
                    }))
                  }
                  placeholder="Plot 14, GIDC Sachin, Surat 394230"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
                  Bottom Label Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-xs text-[#8A9270] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EDF0E4] file:text-[#546B41] hover:file:bg-[#DCE1D0] file:cursor-pointer cursor-pointer border border-[#EADFC8] rounded-xl p-1"
                />
                {uploadingImage && (
                  <div className="text-xs text-[#546B41] mt-1 font-bold animate-pulse">
                    Uploading image...
                  </div>
                )}
                {uploadImageError && (
                  <div className="text-xs text-[#EF4444] mt-1 font-bold">
                    {uploadImageError}
                  </div>
                )}
                {settings?.label_image_url && (
                  <div className="text-xs text-[#16A34A] mt-1 font-bold flex items-center gap-1">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>{" "}
                    Image uploaded!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Label size */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EADFC8] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EADFC8] bg-[#F6EEDB]">
              <h2 className="text-sm font-bold text-[#2F3A22]">Label Size</h2>
            </div>
            <div className="flex flex-wrap gap-3 p-6">
              {SIZES.map((s) => {
                const isActive = settings?.label_size === s;
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setSettings((p: any) => ({ ...p, label_size: s }))
                    }
                    className={`px-6 py-2.5 text-sm font-bold font-mono rounded-xl transition-all ${isActive ? "bg-[#EDF0E4] text-[#546B41] ring-2 ring-[#546B41]" : "bg-[#F8F9F7] border border-[#EADFC8] text-[#6B7556] hover:bg-white hover:border-[#CBD7B5]"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={saving}
            onClick={save}
            className="w-full flex items-center justify-center py-3.5 bg-[#546B41] text-white text-sm font-bold rounded-xl hover:bg-[#435534] transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Label Settings"}
          </button>
        </div>

        <div className="space-y-6">
          {/* Template picker */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EADFC8] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EADFC8] bg-[#F6EEDB]">
              <h2 className="text-sm font-bold text-[#2F3A22]">
                Label Templates
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              {TEMPLATES.map((t) => {
                const isActive = settings?.template_id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setSettings((p: any) => ({ ...p, template_id: t.id }))
                    }
                    className={`p-4 text-left rounded-xl border transition-all relative ${isActive ? "bg-[#EDF0E4] border-[#546B41] ring-1 ring-[#546B41]" : "bg-white border-[#EADFC8] hover:border-[#CBD7B5] hover:shadow-sm"}`}
                  >
                    <div className="font-bold text-sm text-[#2F3A22] mb-1">
                      {t.name}
                    </div>
                    <div className="text-xs text-[#8A9270]">{t.desc}</div>
                    {isActive && (
                      <div className="absolute top-4 right-4">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#546B41"
                          strokeWidth="2.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EADFC8] overflow-hidden sticky top-6">
            <div className="px-6 py-5 border-b border-[#EADFC8] bg-[#F6EEDB] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2F3A22]">Live Preview</h2>
              <span className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest bg-[#EADFC8] px-2 py-0.5 rounded-full">
                {TEMPLATES.find((t) => t.id === settings?.template_id)?.name} •{" "}
                {settings?.label_size}
              </span>
            </div>
            <div className="p-6 bg-[#F8F9F7] flex flex-col items-center">
              {/* Fake Label Box */}
              <div
                className="w-full max-w-[350px] bg-white border border-[#CBD7B5] shadow-sm p-4 font-mono text-xs text-black relative"
                style={{ aspectRatio: "4/6" }}
              >
                <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-3">
                  <div>
                    {settings?.show_brand_name && settings?.brand_name && (
                      <div className="font-bold text-sm mb-1">
                        {settings.brand_name}
                      </div>
                    )}
                    <div className="font-black text-lg tracking-wide mb-1">
                      {(couriers.length > 0
                        ? couriers[0].name
                        : "DELHIVERY"
                      ).toUpperCase()}
                    </div>
                    <div className="text-[10px]">AWB: DEL1234567890</div>
                  </div>
                  <div className="bg-black text-white px-2 py-1 font-bold text-[10px]">
                    PREPAID
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-bold text-[10px] mb-1">SHIP TO:</div>
                  <div className="font-semibold">Rahul Sharma</div>
                  <div>204 MG Road, Bengaluru 560001</div>
                  <div>Ph: 9876543210</div>
                </div>

                {settings?.show_return_addr && settings?.return_address && (
                  <div className="mb-4 pt-3 border-t border-black/20 text-[10px]">
                    <div className="font-bold mb-1">RETURN TO:</div>
                    <div>{settings.return_address}</div>
                    {settings?.show_mobile && settings?.phone_number && (
                      <div className="mt-1 font-bold">
                        Ph: {settings.phone_number}
                      </div>
                    )}
                  </div>
                )}

                {settings?.label_image_url && (
                  <div className="mb-4 flex justify-center pt-2 border-t border-black/10">
                    <img
                      src={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${settings.label_image_url}`}
                      className="max-h-12 object-contain"
                      alt="Label Bottom"
                    />
                  </div>
                )}

                <div className="mt-auto absolute bottom-4 left-4 right-4">
                  <div className="h-16 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] w-full mb-2 opacity-80" />
                  <div className="border-t-2 border-black pt-2 flex justify-between text-[10px] font-semibold">
                    <div>Wt: 0.5kg • ORD-2026-001</div>
                    {settings?.show_gst && <div>GST: 24AAAA0000A1Z5</div>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 w-full max-w-[350px]">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-white border border-[#EADFC8] text-[#2F3A22] text-sm font-bold rounded-xl hover:bg-[#FFF8EC] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print Test
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-[#FFF8EC] border border-[#EADFC8] text-[#6B7556] text-sm font-bold rounded-xl hover:bg-white hover:text-[#546B41] transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
