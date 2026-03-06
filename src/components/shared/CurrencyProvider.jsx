import { createContext, useContext, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CURRENCIES = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", rate: 1 },
  { code: "USD", symbol: "$", name: "US Dollar", rate: null },
  { code: "EUR", symbol: "€", name: "Euro", rate: null },
  { code: "GBP", symbol: "£", name: "British Pound", rate: null },
];

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [rates, setRates] = useState({ NGN: 1 });

  const changeCurrency = useCallback(async (code) => {
    setCurrencyCode(code);
    if (code === "NGN" || rates[code]) return;
    try {
      const result = await base44.integrations.Core.GetExchangeRate(code);
      if (result?.rate) {
        setRates(prev => ({ ...prev, [code]: result.rate }));
      }
    } catch (e) {
      console.error("Failed to fetch exchange rate", e);
    }
  }, [rates]);

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const rate = rates[currencyCode] || 1;

  const fmt = useCallback((valueInNGN, decimals = 0) => {
    if (valueInNGN == null || isNaN(valueInNGN)) return "—";
    const converted = valueInNGN * rate;
    return `${currency.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, [currency, rate]);

  return (
    <CurrencyContext.Provider value={{ currency, currencies: CURRENCIES, currencyCode, changeCurrency, fmt, symbol: currency.symbol, rate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
