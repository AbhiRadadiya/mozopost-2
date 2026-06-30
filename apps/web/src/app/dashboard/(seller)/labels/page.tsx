"use client";

import { useEffect, useState, useRef } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const SIZES = ["A4", "4X6"];
const TEMPLATES = [
  { id: 1, name: "MozoPost Standard", desc: "Classic layout with all details" },
  { id: 2, name: "Ekart Classic", desc: "Minimal info, larger barcode" },
  { id: 3, name: "Delhivery Surface", desc: "Your logo prominently displayed" },
  { id: 4, name: "Shadowfax", desc: "COD amount highlighted" },
  { id: 5, name: "Shadowfax DS", desc: "Optimised for thermal" },
  { id: 6, name: "Ekart Prime", desc: "Premium template" },
];

const PALETTE = [
  { id: "brand", icon: "✧", label: "Brand / Logo" },
  { id: "name", icon: "👤", label: "Ship To Name" },
  { id: "address", icon: "⌖", label: "Address" },
  { id: "cod", icon: "₹", label: "COD Amount" },
  { id: "order", icon: "≡", label: "Order ID" },
  { id: "awb", icon: "ǁ", label: "AWB Barcode" },
  { id: "qr", icon: "▦", label: "QR Code" },
  { id: "weight", icon: "⚖", label: "Weight" },
  { id: "courier", icon: "🚚", label: "Courier" },
  { id: "table", icon: "▤", label: "Product Table" },
  { id: "divider", icon: "—", label: "Divider" },
];

const META: Record<string, any> = {
  brand: { kind: "text", text: "MozoPost Shipping", big: true },
  name: { kind: "text", text: "Simran Simran", bold: true },
  address: {
    kind: "text",
    text: "B-113 Rajveer colony, Delhi 110096",
    small: true,
  },
  cod: { kind: "text", text: "COD ₹ 698.00", box: true, bold: true },
  order: { kind: "text", text: "Order: 184785" },
  awb: { kind: "barcode", text: "CMDC0004156753" },
  qr: { kind: "qr" },
  weight: { kind: "text", text: "Weight: 0.40 kg" },
  courier: { kind: "text", text: "EKART", bold: true },
  table: { kind: "table" },
  divider: { kind: "divider" },
};

export default function LabelsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [couriers, setCouriers] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadImageError, setUploadImageError] = useState("");

  const [activeTab, setActiveTab] = useState("Templates");
  const [print4up, setPrint4up] = useState(false);

  // Design Studio Dragging State
  const [labelEls, setLabelEls] = useState<any[]>([]);
  const [elSeq, setElSeq] = useState(0);
  const [selId, setSelId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [offX, setOffX] = useState(0);
  const [offY, setOffY] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (dragId == null || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - r.left - offX;
    let y = e.clientY - r.top - offY;
    x = Math.max(0, Math.min(x, r.width - 24));
    y = Math.max(0, Math.min(y, r.height - 16));
    setLabelEls((els) =>
      els.map((el) => (el.id === dragId ? { ...el, x, y } : el)),
    );
  };
  const endDrag = () => {
    if (dragId != null) setDragId(null);
  };
  const startDrag = (id: number, e: React.MouseEvent) => {
    const el = labelEls.find((x) => x.id === id);
    if (!el || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    setSelId(id);
    setDragId(id);
    setOffX(px - el.x);
    setOffY(py - el.y);
    e.preventDefault();
    e.stopPropagation();
  };
  const addEl = (type: string) => {
    setElSeq((seq) => {
      const id = seq + 1;
      const n = labelEls.length;
      setLabelEls((els) => [
        ...els,
        { id, type, x: 30 + (n % 4) * 16, y: 24 + n * 22 },
      ]);
      setSelId(id);
      return id;
    });
  };
  const delEl = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLabelEls((els) => els.filter((x) => x.id !== id));
    setSelId(null);
  };

  useEffect(() => {
    Promise.all([api.get("/labels/settings"), api.get("/couriers")])
      .then(([settingsRes, couriersRes]) => {
        setSettings(settingsRes.data.settings);
        setCouriers(couriersRes.data.couriers || []);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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
    alert("Printing...");
  }

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

  const selDesignName =
    TEMPLATES.find((t) => t.id === settings?.template_id)?.name ||
    "MozoPost Standard";

  const renderFakeLabel = (templateId: number) => {
    const name = "Simran Simran";
    const addr = "B-113 Rajveer colony, Delhi 110096";
    const phone = "9876543210";
    const product = "Women's Pack of 3 Pure Cotton...";

    const Barcode = ({ text }: { text?: string }) => (
      <div>
        <div className="h-[30px] w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_6px,#fff_6px,#fff_8px)]"></div>
        {text && <div className="text-[9px] text-center mt-[2px]">{text}</div>}
      </div>
    );

    const apiBase = api.defaults.baseURL?.replace("/api/v1", "") || "";
    const bottomImg = settings?.label_image_url ? (
      <div className="mb-4 flex justify-center pt-2 border-t border-black/10">
        <img
          src={`${apiBase}${settings.label_image_url}`}
          className="max-h-12 object-contain"
          alt="Label Bottom"
        />
      </div>
    ) : null;

    if (templateId === 1) {
      // MozoPost Standard
      return (
        <div className="w-[380px] h-[560px] bg-white border border-[#000] text-black font-[Arial,sans-serif]">
          <div className="flex items-center justify-between p-[10px_12px] border-b border-[#000]">
            <div className="text-[13px] font-[800] leading-[1.1]">
              {settings?.show_brand_name
                ? settings.brand_name || "WOMEN\nATTIRE"
                : "WOMEN\nATTIRE"}
            </div>
            <div className="text-center">
              <div className="text-[14px] font-[800] tracking-[0.5px]">
                MozoPost
              </div>
              <div className="text-[8px] tracking-[2px]">SHIPPING</div>
            </div>
            <div className="text-[13px] font-[800] tracking-[1px]">
              DELHIVERY
            </div>
          </div>
          <div className="p-[8px_12px] border-b border-[#000]">
            <div className="text-[10px] font-[700] text-center mb-[5px]">
              AWB# 41332221588194
            </div>
            <Barcode />
            <div className="text-[9px] text-center mt-[3px]">
              AWB# 41332221588194
            </div>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] border-b border-[#000]">
            <div className="p-[10px] border-r border-[#000] text-[10px] leading-[1.55]">
              <div>
                Ship to: <b>{name}</b>
              </div>
              <div>{addr}</div>
              {settings?.show_mobile && (
                <div className="font-[700] mt-[3px]">Phone: {phone}</div>
              )}
              <div className="font-[700]">PIN - 533287</div>
            </div>
            <div className="p-[10px] text-[11px] leading-[1.6]">
              <div className="font-[700]">COD</div>
              <div className="font-[800]">INR 999.00</div>
              <div className="mt-[6px] text-[9px]">Date</div>
              <div className="text-[9px]">15 Apr 26 | 11:21 AM</div>
            </div>
          </div>
          <div className="grid grid-cols-[1.3fr_1fr] border-b border-[#000] items-center">
            <div className="p-[10px] border-r border-[#000] text-[10px] font-[700]">
              Seller:{" "}
              {settings?.show_brand_name
                ? settings.brand_name || "WOMEN ATTIRE"
                : "WOMEN ATTIRE"}
            </div>
            <div className="p-[8px_10px] text-center">
              <Barcode text="154858" />
            </div>
          </div>
          {bottomImg}
          <div className="grid grid-cols-[1fr_40px_60px_60px] text-[9px] font-[700] border-b border-[#000]">
            <div className="p-[6px]">Product Name</div>
            <div className="p-[6px]">Qty.</div>
            <div className="p-[6px]">Price</div>
            <div className="p-[6px]">Total</div>
          </div>
          <div className="grid grid-cols-[1fr_40px_60px_60px] text-[9px]">
            <div className="p-[6px]">{product}</div>
            <div className="p-[6px]">1</div>
            <div className="p-[6px]">₹999.00</div>
            <div className="p-[6px]">₹999.00</div>
          </div>
        </div>
      );
    }
    if (templateId === 2) {
      // Ekart Classic
      return (
        <div className="w-[380px] h-[560px] bg-white border border-[#000] p-[14px] text-black font-[Arial,sans-serif]">
          <div className="text-[11px] font-[700]">Shipped To</div>
          <div className="text-[13px] font-[800] mt-[8px]">{name}</div>
          <div className="text-[10px] leading-[1.5] mt-[4px]">{addr}</div>
          <div className="border-t-[2px] border-[#000] my-[12px]"></div>
          <div className="flex justify-between">
            <div>
              <div className="text-[15px] font-[800]">CASH ON DELIVERY</div>
              <div className="text-[10px] font-[700] mt-[9px]">
                Amount To Collect - ₹ 698.00
              </div>
              <div className="text-[10px] mt-[6px]">
                Order Date: 18 Jun 2026
              </div>
              <div className="text-[10px] mt-[6px]">Weight: 0.40 kg</div>
            </div>
            <div className="text-center">
              <div className="w-[62px] h-[62px] border-[3px] border-black bg-[repeating-conic-gradient(#000_0%_25%,#fff_0%_50%)] bg-[length:9px_9px] mx-auto"></div>
              <div className="text-[10px] font-[700] mt-[4px]">EKART</div>
            </div>
          </div>
          <div className="text-[9px] text-right mt-[2px]">CMDC0004156753</div>
          <div className="mt-[8px]">
            <Barcode />
          </div>
          <div className="text-[11px] font-[700] mt-[5px]">Order: 184785</div>
          <div className="border border-[#000] mt-[14px]">
            <div className="grid grid-cols-[38px_1fr_42px] bg-[#f3dfe3] text-[9px] font-[700] text-center border-b border-[#000]">
              <div className="p-[5px] border-r border-[#000]">Sr No</div>
              <div className="p-[5px] border-r border-[#000]">Product Name</div>
              <div className="p-[5px]">Qty</div>
            </div>
            <div className="grid grid-cols-[38px_1fr_42px] text-[9px]">
              <div className="p-[6px] border-r border-[#000] text-center">
                1
              </div>
              <div className="p-[6px] border-r border-[#000] leading-[1.4]">
                {product}
              </div>
              <div className="p-[6px] text-center">1</div>
            </div>
          </div>
          {bottomImg}
          <div className="mt-[16px] text-center">
            <Barcode text="CMDC0004156753" />
          </div>
        </div>
      );
    }
    if (templateId === 3) {
      // Delhivery Surface
      return (
        <div className="w-[380px] h-[560px] bg-white border-[2px] border-[#000] text-black font-[Arial,sans-serif]">
          <div className="grid grid-cols-2 border-b-[2px] border-[#000]">
            <div className="p-[12px] border-r-[2px] border-[#000] text-[16px] font-[800]">
              {settings?.show_brand_name
                ? settings.brand_name || "Herbal Products"
                : "Herbal Products"}
            </div>
            <div className="p-[12px] text-center">
              <div className="text-[15px] font-[800] tracking-[1px]">
                DELHIVERY
              </div>
              <div className="text-[10px] font-[700] tracking-[3px]">
                SURFACE
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 border-b-[2px] border-[#000]">
            <div className="p-[12px] border-r-[2px] border-[#000] text-center">
              <Barcode text="13630511683253" />
            </div>
            <div className="p-[12px] text-center flex flex-col justify-center">
              <div className="text-[14px] font-[800]">(COD)</div>
              <div className="text-[16px] font-[800] mt-[6px]">Rs. 599.00</div>
            </div>
          </div>
          <div className="grid grid-cols-[1.1fr_1fr] border-b-[2px] border-[#000] text-[10px]">
            <div className="p-[10px] border-r-[2px] border-[#000] leading-[1.5]">
              <div className="flex justify-between">
                <span>Deliver To:</span>
                <b>MEE/PCK</b>
              </div>
              <div className="font-[800] mt-[4px]">{name}</div>
              <div className="font-[700]">Contact: {phone}</div>
              <div className="font-[700] mt-[3px]">Address: {addr}</div>
            </div>
            <div className="p-[10px] leading-[1.7]">
              <div>Order Id: 21017686</div>
              <div>Ref./Invoice#: #1635</div>
              <div>Date: 20-06-2026</div>
              <div>Weight: 0.20 kg</div>
            </div>
          </div>
          {bottomImg}
          <div className="grid grid-cols-[1fr_50px_36px_70px] text-[9px] font-[700] border-b border-[#000]">
            <div className="p-[6px] border-r border-[#000]">Product Name</div>
            <div className="p-[6px] border-r border-[#000]">SKU</div>
            <div className="p-[6px] border-r border-[#000]">Qty</div>
            <div className="p-[6px] text-right">Price</div>
          </div>
          <div className="grid grid-cols-[1fr_50px_36px_70px] text-[9px] border-b border-[#000]">
            <div className="p-[6px] border-r border-[#000] leading-[1.4]">
              {product}
            </div>
            <div className="p-[6px] border-r border-[#000]"></div>
            <div className="p-[6px] border-r border-[#000] text-center">1</div>
            <div className="p-[6px] text-right">599.00</div>
          </div>
          <div className="grid grid-cols-[1fr_36px_70px] text-[9px] font-[700]">
            <div className="p-[6px] border-r border-[#000] text-right">
              Total
            </div>
            <div className="p-[6px] border-r border-[#000] text-center">1</div>
            <div className="p-[6px] text-right">Rs.599.00</div>
          </div>
        </div>
      );
    }
    if (templateId === 4) {
      // Shadowfax
      return (
        <div className="w-[380px] h-[560px] bg-white border border-[#000] text-black font-[Arial,sans-serif]">
          <div className="border-b border-[#000] p-[6px_10px] text-[11px] font-[700]">
            {settings?.show_brand_name
              ? settings.brand_name || "herbal products"
              : "herbal products"}
          </div>
          <div className="p-[10px]">
            <div className="flex justify-between items-start">
              <div className="text-[11px] font-[700]">Ship To</div>
              <div className="text-[10px] font-[700]">Shadowfax-S</div>
            </div>
            <div className="flex justify-between gap-[12px] mt-[6px]">
              <div className="text-[10px] leading-[1.55]">
                <div className="font-[700]">{name}</div>
                <div>{addr}</div>
                <div>
                  Ph: <b>+91{phone}</b>
                </div>
              </div>
              <div className="shrink-0 w-[120px]">
                <Barcode />
              </div>
            </div>
            <div className="flex justify-between gap-[12px] mt-[10px]">
              <div className="text-[10px] leading-[1.7]">
                <div>
                  AWB: <b>SF3117462190SFS</b>
                </div>
                <div>Route Code:</div>
                <div>
                  Weight: <b>0.40 kg</b>
                </div>
              </div>
              <div className="shrink-0 self-start w-[120px]">
                <Barcode text="Order: 2732" />
              </div>
            </div>
            <div className="border border-[#000] mt-[10px]">
              <div className="grid grid-cols-[1fr_44px] text-[9px] font-[700] border-b border-[#000]">
                <div className="p-[5px] border-r border-[#000]">Product</div>
                <div className="p-[5px]">Qty</div>
              </div>
              <div className="grid grid-cols-[1fr_44px] text-[9px]">
                <div className="p-[6px] border-r border-[#000] leading-[1.4]">
                  {product}
                </div>
                <div className="p-[6px] text-center">1</div>
              </div>
              <div className="grid grid-cols-[1fr_44px] text-[9px] font-[700] border-t border-[#000]">
                <div className="p-[5px] border-r border-[#000] text-right">
                  Total Quantity
                </div>
                <div className="p-[5px] text-center">1</div>
              </div>
            </div>
            {bottomImg}
            <div className="text-[10px] font-[700] mt-[9px]">
              Payment Mode: COD
            </div>
            <div className="text-[10px] font-[700]">
              Collectable Amount: ₹ 599.00
            </div>
          </div>
        </div>
      );
    }
    if (templateId === 5) {
      // Shadowfax DS
      return (
        <div className="w-[380px] h-[560px] bg-white border border-[#000] p-[14px] text-black font-[Arial,sans-serif]">
          <div className="text-[11px] font-[700]">To:</div>
          <div className="text-[12px] font-[800] mt-[5px]">{name}</div>
          <div className="text-[10px] leading-[1.5] mt-[3px]">{addr}</div>
          <div className="border-t-[2px] border-[#000] my-[12px]"></div>
          <div className="flex justify-between">
            <div className="text-[10px] leading-[1.7]">
              <div>
                Order Date: <b>2026-06-26</b>
              </div>
              <div>Invoice No: Retail07930</div>
            </div>
            <div className="text-center w-[120px]">
              <Barcode text="#ZS100671001" />
            </div>
          </div>
          <div className="border-t-[2px] border-[#000] my-[12px]"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[22px] font-[800]">COD</div>
              <div className="text-[14px]">Rs. 799.00</div>
              <div className="text-[11px] mt-[4px]">DEAD WEIGHT: 0.70 kg</div>
            </div>
            <div className="text-center w-[120px]">
              <div className="text-[9px] font-[700] mb-[3px]">
                Shadowfax DS 1kg
              </div>
              <Barcode />
              <div className="text-[8px] mt-[3px] leading-[1.4]">
                Awb: SF3566747685KAD
              </div>
            </div>
          </div>
          {bottomImg}
          <div className="border border-[#000] mt-[12px]">
            <div className="grid grid-cols-[1fr_1.2fr_36px_60px] text-[9px] font-[700] text-center border-b border-[#000]">
              <div className="p-[5px] border-r border-[#000]">SKU</div>
              <div className="p-[5px] border-r border-[#000]">Item</div>
              <div className="p-[5px] border-r border-[#000]">Qty</div>
              <div className="p-[5px]">Amount</div>
            </div>
            <div className="grid grid-cols-[1fr_1.2fr_36px_60px] text-[9px]">
              <div className="p-[6px] border-r border-[#000] text-center">
                171000163
              </div>
              <div className="p-[6px] border-r border-[#000] leading-[1.3] truncate">
                {product}
              </div>
              <div className="p-[6px] border-r border-[#000] text-center">
                1
              </div>
              <div className="p-[6px] text-center">Rs. 799</div>
            </div>
          </div>
          <div className="text-[8px] leading-[1.5] mt-[12px]">
            This is a computer generated document, hence does not require
            signature.
          </div>
        </div>
      );
    }
    if (templateId === 6) {
      // Ekart Prime
      return (
        <div className="w-[380px] h-[560px] bg-white border-[2px] border-dashed border-[#000] p-[12px] text-black font-[Arial,sans-serif]">
          <div className="text-[10px] text-right font-[700]">
            {settings?.show_brand_name
              ? settings.brand_name || "fashion shop"
              : "fashion shop"}
          </div>
          <div className="flex justify-between gap-[12px] border-b border-[#000] pb-[10px]">
            <div className="text-[10px] leading-[1.5]">
              <div className="font-[800]">Deliver To:</div>
              <div className="font-[800]">{name}</div>
              <div>{addr}</div>
              <div>
                Mobile: <b>{phone}</b>
              </div>
            </div>
            <div className="text-center border-l border-[#000] pl-[12px] shrink-0">
              <div className="text-[13px] font-[800]">COD</div>
              <div className="text-[13px] font-[800]">Rs. 999</div>
              <div className="text-[9px] mt-[4px]">Weight - 0.5 Kg</div>
            </div>
          </div>
          <div className="text-[10px] font-[700] text-center mt-[10px]">
            Order ID - 62738 Date: 25-09-2026
          </div>
          <div className="text-center mt-[8px] flex justify-center">
            <div className="w-[180px]">
              <Barcode />
            </div>
          </div>
          <div className="text-[10px] font-[700] text-center mt-[4px] border-b border-[#000] pb-[10px]">
            Ekart Prime - FSNC0016999522
          </div>
          {bottomImg}
          <div className="border border-[#000] mt-[12px]">
            <div className="grid grid-cols-[1fr_36px_30px_54px_56px] text-[8px] font-[700] border-b border-[#000]">
              <div className="p-[5px] border-r border-[#000]">Product</div>
              <div className="p-[5px] border-r border-[#000]">SKU</div>
              <div className="p-[5px] border-r border-[#000]">Qty</div>
              <div className="p-[5px] border-r border-[#000]">Amt</div>
              <div className="p-[5px]">Total</div>
            </div>
            <div className="grid grid-cols-[1fr_36px_30px_54px_56px] text-[8px]">
              <div className="p-[6px] border-r border-[#000] truncate">
                {product}
              </div>
              <div className="p-[6px] border-r border-[#000]"></div>
              <div className="p-[6px] border-r border-[#000] text-center">
                1
              </div>
              <div className="p-[6px] border-r border-[#000]">999.00</div>
              <div className="p-[6px]">999.00</div>
            </div>
          </div>
          <div className="text-[7px] leading-[1.5] mt-[14px] border-t border-[#000] pt-[8px]">
            This is computer generated document, hence not required signature.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto animate-fade-up pb-[100px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-[#2F3A22] tracking-[-0.4px]">
          Label Settings
        </h1>
        <button
          disabled={saving}
          onClick={save}
          className="bg-[#546B41] text-[#FFF8EC] rounded-[8px] px-[16px] py-[8px] text-[13px] font-semibold cursor-pointer hover:bg-[#63794E] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {error && (
        <div className="p-4 mt-4 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className="p-4 mt-4 rounded-[12px] bg-[#EDF0E4] border border-[#CBD7B5] text-sm font-medium text-[#546B41] flex items-center gap-3">
          <span>✓</span> {success}
        </div>
      )}

      <div className="inline-flex bg-[#FFFFFF] border border-[#E2D4B8] rounded-[9px] p-[3px] mt-[18px]">
        <div
          onClick={() => setActiveTab("Templates")}
          className={`px-[16px] py-[7px] text-[13px] font-semibold cursor-pointer rounded-[6px] transition-colors ${
            activeTab === "Templates"
              ? "bg-[#EDF0E4] text-[#546B41]"
              : "text-[#8A9270] hover:text-[#546B41]"
          }`}
        >
          Templates
        </div>
        <div
          onClick={() => setActiveTab("Design Studio")}
          className={`px-[16px] py-[7px] text-[13px] font-semibold cursor-pointer rounded-[6px] transition-colors ${
            activeTab === "Design Studio"
              ? "bg-[#EDF0E4] text-[#546B41]"
              : "text-[#8A9270] hover:text-[#546B41]"
          }`}
        >
          Design Studio
        </div>
      </div>

      {activeTab === "Templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-[26px] mt-[18px]">
          {/* Left Column - Template Selection */}
          <div>
            <div className="text-[13px] font-semibold mb-[10px] text-[#2F3A22]">
              Choose a template
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              {TEMPLATES.map((t) => {
                const isSelected = settings?.template_id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() =>
                      setSettings((p: any) => ({ ...p, template_id: t.id }))
                    }
                    className="cursor-pointer group"
                  >
                    <div
                      className={`w-[148px] h-[218px] overflow-hidden bg-white rounded-[6px] transition-all duration-200 border-2 ${
                        isSelected
                          ? "border-[#546B41] shadow-md ring-2 ring-[#546B41]/20"
                          : "border-[#E2D4B8] group-hover:border-[#CBD7B5]"
                      }`}
                    >
                      <div className="origin-top-left scale-[0.385] w-[380px] h-[560px] pointer-events-none">
                        {renderFakeLabel(t.id)}
                      </div>
                    </div>
                    <div
                      className={`text-[12px] text-center mt-[8px] font-medium transition-colors ${
                        isSelected
                          ? "text-[#546B41] font-bold"
                          : "text-[#8A9270]"
                      }`}
                    >
                      {t.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#2F3A22]">
                Live preview · {selDesignName}
              </div>
              <div className="flex gap-[10px]">
                <button
                  onClick={handlePrint}
                  className="bg-[#546B41] text-[#FFF8EC] rounded-[8px] px-[16px] py-[8px] text-[13px] font-semibold cursor-pointer hover:bg-[#63794E] transition-colors"
                >
                  ⎙ Print Label
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-[8px] px-[16px] py-[8px] text-[13px] font-medium cursor-pointer hover:bg-[#E0E7CE] transition-colors"
                >
                  ↧ Download PDF
                </button>
              </div>
            </div>
            <div className="mt-[14px] bg-[#FFF8EC] border border-[#E2D4B8] rounded-[12px] p-[26px] flex justify-center overflow-auto min-h-[600px]">
              <div className="shadow-[0_6px_24px_rgba(0,0,0,0.4)] shrink-0">
                {renderFakeLabel(settings?.template_id || 1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Design Studio" && (
        <div className="grid grid-cols-[204px_1fr_196px] gap-[18px] mt-[18px]">
          {/* Elements */}
          <div>
            <div className="text-[13px] font-semibold mb-[10px] text-[#2F3A22]">
              Elements
            </div>
            <div className="flex flex-col gap-[8px]">
              {PALETTE.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addEl(p.id)}
                  className="flex items-center gap-[10px] bg-[#FFFFFF] border border-[#E2D4B8] rounded-[9px] px-[12px] py-[10px] text-[13px] text-[#2F3A22] font-medium cursor-pointer hover:border-[#546B41] transition-colors select-none"
                >
                  <span className="w-[22px] text-center text-[#546B41] text-[12px]">
                    {p.icon}
                  </span>
                  {p.label}
                  <span className="ml-auto text-[#8A9270]">+</span>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div>
            <div className="text-[12px] text-[#8A9270] mb-[10px]">
              Click an element to add it, then drag to position. Click a placed
              element to select & delete.
            </div>
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                onMouseMove={onMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                className="relative w-[380px] h-[560px] bg-white border border-[#E2D4B8] rounded-[4px] overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.4)]"
                style={{
                  backgroundImage:
                    "linear-gradient(#eef 1px, transparent 1px), linear-gradient(90deg, #eef 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                {labelEls.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[#bbb] text-[13px] pointer-events-none">
                    Add elements from the left →
                  </div>
                )}
                {labelEls.map((e) => {
                  const m = META[e.type] || { kind: "text", text: e.type };
                  const sel = e.id === selId;
                  return (
                    <div
                      key={e.id}
                      onMouseDown={(ev) => startDrag(e.id, ev)}
                      style={{
                        position: "absolute",
                        left: e.x,
                        top: e.y,
                        cursor: "move",
                        userSelect: "none",
                        outline: sel ? "2px solid #546B41" : "none",
                        outlineOffset: "2px",
                      }}
                    >
                      {m.kind === "text" && (
                        <div
                          style={{
                            color: "#000",
                            fontSize: m.big ? 16 : m.small ? 9 : 11,
                            fontWeight: m.bold || m.big ? 700 : 400,
                            border: m.box ? "1px solid #000" : "none",
                            padding: m.box ? "4px 8px" : 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.text}
                        </div>
                      )}
                      {m.kind === "barcode" && (
                        <div>
                          <div className="w-[160px] h-[40px] bg-[repeating-linear-gradient(90deg,#000_0_2px,#fff_2px_3px,#000_3px_6px,#fff_6px_8px,#000_8px_9px,#fff_9px_12px)]"></div>
                          <div className="text-[9px] text-[#000] text-center mt-[2px]">
                            {m.text}
                          </div>
                        </div>
                      )}
                      {m.kind === "qr" && (
                        <div className="w-[62px] h-[62px] border-[3px] border-[#000] bg-[repeating-conic-gradient(#000_0%_25%,#fff_0%_50%)] bg-[length:9px_9px]"></div>
                      )}
                      {m.kind === "divider" && (
                        <div className="w-[220px] border-t-[2px] border-[#000]"></div>
                      )}
                      {m.kind === "table" && (
                        <div className="w-[200px] border border-[#000] text-[9px] text-[#000]">
                          <div className="grid grid-cols-[1fr_34px] border-b border-[#000] font-[700]">
                            <div className="p-[3px] border-r border-[#000]">
                              Product
                            </div>
                            <div className="p-[3px]">Qty</div>
                          </div>
                          <div className="grid grid-cols-[1fr_34px]">
                            <div className="p-[3px] border-r border-[#000]">
                              Co-Ord Set (C-10)
                            </div>
                            <div className="p-[3px] text-center">1</div>
                          </div>
                        </div>
                      )}
                      {sel && (
                        <span
                          onClick={(ev) => delEl(e.id, ev)}
                          className="absolute -top-[9px] -right-[9px] w-[18px] h-[18px] rounded-full bg-[#B4623F] text-white text-[11px] flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Layout */}
          <div>
            <div className="text-[15px] font-semibold mb-[10px] text-[#2F3A22]">
              Layout
            </div>
            <div className="text-[14px] text-[#8A9270] leading-[1.6]">
              {labelEls.length} element(s) placed on the label.
            </div>

            <div
              onClick={() => {
                setLabelEls([]);
                setSelId(null);
              }}
              className="mt-[14px] bg-[#FFFFFF] border border-[#E2D4B8] rounded-[8px] py-[9px] px-[14px] text-[14px] cursor-pointer text-center text-[#2F3A22] font-medium hover:border-[#B4623F] hover:text-[#B4623F] transition-colors"
            >
              ↺ Clear canvas
            </div>
            <div
              onClick={() => alert("Layout saved!")}
              className="mt-[10px] bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-[8px] py-[9px] px-[14px] text-[14px] font-medium cursor-pointer text-center hover:bg-[#E0E7CE] transition-colors"
            >
              ⛁ Save Layout
            </div>
            <div
              onClick={handlePrint}
              className="mt-[10px] bg-[#546B41] text-[#FFF8EC] rounded-[8px] py-[9px] px-[14px] text-[14px] font-semibold cursor-pointer text-center hover:bg-[#63794E] transition-colors"
            >
              ⎙ Print Label
            </div>
          </div>
        </div>
      )}

      <div className="text-[16px] font-semibold mt-[24px] text-[#2F3A22]">
        Format
      </div>
      <div className="inline-flex bg-[#FFFFFF] border border-[#E2D4B8] rounded-[24px] p-[4px] mt-[12px]">
        {SIZES.map((s) => (
          <div
            key={s}
            onClick={() => setSettings((p: any) => ({ ...p, label_size: s }))}
            className={`px-[16px] py-[6px] text-[14px] font-bold rounded-[20px] cursor-pointer transition-colors ${
              settings?.label_size === s
                ? "bg-[#546B41] text-[#FFF8EC]"
                : "text-[#8A9270] hover:text-[#546B41]"
            }`}
          >
            {s}
          </div>
        ))}
      </div>
      <div
        onClick={() => setPrint4up(!print4up)}
        className="flex items-center gap-[10px] mt-[16px] text-[14px] text-[#6B7556] cursor-pointer select-none group w-fit"
      >
        <span
          className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center border transition-colors ${
            print4up
              ? "bg-[#546B41] border-[#546B41] text-white"
              : "bg-white border-[#E2D4B8] group-hover:border-[#CBD7B5]"
          }`}
        >
          {print4up && "✓"}
        </span>
        Print 4 labels (4x6) on a single A4 page
      </div>

      <div className="bg-[#FFFFFF] border border-[#E2D4B8] rounded-[14px] p-[24px] mt-[24px]">
        <div className="text-[16px] font-semibold text-[#2F3A22]">
          Details to show on label
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mt-[18px]">
          {[
            {
              key: "show_brand_name",
              label: "Display order value in COD and Prepaid label",
              hint: "For some TPLs, COD amount will be displayed even if disabled.",
            },
            {
              key: "show_logo",
              label: "Display Customer's Mobile Number in Label",
              hint: "For some TPLs, mobile number will be displayed even if disabled.",
            },
            {
              key: "show_return_addr",
              label: "Display Customer's Address in Label",
              hint: "If disabled, customer's address should not be visible on the label.",
            },
            {
              key: "show_mobile",
              label: "Display Shipper Address",
              hint: "If disabled, shipper address should not be visible on the label.",
            },
            {
              key: "show_gst",
              label: "Include Customer Invoice",
              hint: "Not available for 4x6 format due to size constraints.",
            },
            {
              key: "hide_product", // Assuming a placeholder if it's not in DB yet
              label: "Hide Product Name in Label",
              hint: "If enabled, product name should not be visible on the label.",
            },
          ].map((o) => {
            const isActive = settings?.[o.key];
            return (
              <div
                key={o.key}
                onClick={() => toggle(o.key)}
                className="flex gap-[12px] cursor-pointer group"
              >
                <span
                  className={`w-[20px] h-[20px] rounded-[6px] shrink-0 flex items-center justify-center border transition-colors mt-[2px] ${
                    isActive
                      ? "bg-[#546B41] border-[#546B41] text-white"
                      : "bg-white border-[#E2D4B8] group-hover:border-[#CBD7B5]"
                  }`}
                >
                  {isActive && (
                    <span className="text-[14px] leading-none">✓</span>
                  )}
                </span>
                <div>
                  <div
                    className={`text-[14px] font-semibold transition-colors ${isActive ? "text-[#2F3A22]" : "text-[#8A9270]"}`}
                  >
                    {o.label}
                  </div>
                  <div className="text-[13px] text-[#8A9270] mt-[5px] leading-[1.5]">
                    {o.hint}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-[24px] pt-[24px] border-t border-[#E2D4B8]">
          <div className="text-[16px] font-semibold text-[#2F3A22]">
            Brand & Address Details
          </div>
          <div className="text-[13px] text-[#8A9270] mt-[6px] leading-[1.5]">
            Configure the specific text values to be printed on your labels if
            enabled above.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mt-[14px]">
            <div>
              <label className="block text-[13px] font-semibold text-[#6B7556] mb-[6px] uppercase tracking-wide">
                Brand Name
              </label>
              <input
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[14px] text-[#2F3A22] outline-none focus:border-[#546B41] transition-colors"
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
              <label className="block text-[13px] font-semibold text-[#6B7556] mb-[6px] uppercase tracking-wide">
                Return Address
              </label>
              <input
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[14px] text-[#2F3A22] outline-none focus:border-[#546B41] transition-colors"
                value={settings?.return_address || ""}
                onChange={(e) =>
                  setSettings((p: any) => ({
                    ...p,
                    return_address: e.target.value,
                  }))
                }
                placeholder="Plot 14, Surat 394230"
              />
            </div>
          </div>
        </div>

        <div className="mt-[24px] pt-[24px] border-t border-[#E2D4B8]">
          <div className="text-[16px] font-semibold text-[#2F3A22]">
            Label Badges & Logo
          </div>
          <div className="text-[13px] text-[#8A9270] mt-[6px] leading-[1.5]">
            Add up to 4 certification badges or a custom logo to display on your
            shipping label (JPG, PNG, &lt;200KB).
          </div>
          <div className="flex gap-[12px] mt-[14px]">
            <label className="w-[80px] h-[80px] rounded-[10px] border border-dashed border-[#D8CBAE] bg-[#FFF8EC] flex flex-col items-center justify-center text-[#C2BC9E] cursor-pointer hover:border-[#546B41] hover:text-[#546B41] transition-colors relative overflow-hidden group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {settings?.label_image_url ? (
                <img
                  src={`${api.defaults.baseURL?.replace("/api/v1", "") || ""}${settings.label_image_url}`}
                  className="w-full h-full object-cover"
                  alt="Badge"
                />
              ) : (
                <span className="text-[24px] leading-none mb-1">+</span>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-[#FFF8EC]/80 flex items-center justify-center text-[10px] font-bold text-[#546B41]">
                  Up...
                </div>
              )}
            </label>
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="w-[80px] h-[80px] rounded-[10px] border border-dashed border-[#D8CBAE] bg-[#FFF8EC] flex items-center justify-center text-[#C2BC9E] text-[24px] cursor-pointer hover:border-[#546B41] hover:text-[#546B41] transition-colors"
              >
                +
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
