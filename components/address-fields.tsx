"use client";

import { useState } from "react";
import { COUNTRIES, getStateOptions, stateLabel, zipLabel } from "@/lib/address";

const inputCls = "h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary";
const labelCls = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

export function AddressFields({
  defaultCountry = "US",
  defaultAddress = "",
  defaultCity = "",
  defaultState = "",
  defaultZip = ""
}: {
  defaultCountry?: string;
  defaultAddress?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
}) {
  const [country, setCountry] = useState(defaultCountry || "US");
  const stateOpts = getStateOptions(country);

  return (
    <div className="col-span-full grid gap-4">
      <div className="grid gap-1">
        <label className={labelCls}>Country</label>
        <select
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputCls}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className={labelCls}>Street address</label>
        <input
          name="propertyAddress"
          type="text"
          defaultValue={defaultAddress}
          required
          placeholder="123 Main St"
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-1">
          <label className={labelCls}>City</label>
          <input
            name="city"
            type="text"
            defaultValue={defaultCity}
            required
            className={inputCls}
          />
        </div>

        <div className="grid gap-1">
          <label className={labelCls}>{stateLabel(country)}</label>
          {stateOpts ? (
            <select name="state" defaultValue={defaultState} className={inputCls}>
              <option value="">Select…</option>
              {stateOpts.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.name}</option>
              ))}
            </select>
          ) : (
            <input
              name="state"
              type="text"
              defaultValue={defaultState}
              placeholder={stateLabel(country)}
              className={inputCls}
            />
          )}
        </div>

        <div className="grid gap-1">
          <label className={labelCls}>{zipLabel(country)}</label>
          <input
            name="zip"
            type="text"
            defaultValue={defaultZip}
            placeholder={country === "US" ? "78701" : country === "CA" ? "M5V 3L9" : ""}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

/** Simpler variant for organization/profile addresses (no propertyAddress key) */
export function OrgAddressFields({
  defaultCountry = "US",
  defaultAddress = ""
}: {
  defaultCountry?: string;
  defaultAddress?: string;
}) {
  const [country, setCountry] = useState(defaultCountry || "US");

  return (
    <div className="col-span-full grid gap-4">
      <div className="grid gap-1">
        <label className={labelCls}>Country</label>
        <select
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputCls}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className={labelCls}>Address</label>
        <input
          name="address"
          type="text"
          defaultValue={defaultAddress}
          placeholder={country === "US" ? "123 Main St, Austin, TX 78701" : "Street address, city, region, postal code"}
          className={inputCls}
        />
        <p className="text-xs text-muted-foreground">Full address including city, state/province, and postal code.</p>
      </div>
    </div>
  );
}
