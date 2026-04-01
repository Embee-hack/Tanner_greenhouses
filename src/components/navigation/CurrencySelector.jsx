import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/shared/CurrencyProvider.jsx";

export default function CurrencySelector() {
  const { currency, currencies, changeCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 bg-muted/50 hover:bg-muted transition-all"
      >
        <span>{currency.symbol}</span>
        <span>{currency.code}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
            {currencies.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  changeCurrency(item.code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2",
                  item.code === currency.code && "text-primary font-semibold"
                )}
              >
                <span className="w-5">{item.symbol}</span>
                <span>{item.code}</span>
                <span className="text-muted-foreground ml-auto">{item.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
