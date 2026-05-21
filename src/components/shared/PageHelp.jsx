import { HelpCircle } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { getPageHelp } from "@/lib/pageHelp.js";

export default function PageHelp({ pageName, open, onOpenChange }) {
  const help = getPageHelp(pageName);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(true)} className="hidden sm:inline-flex">
        <HelpCircle className="w-4 h-4" />
        Help
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(true)} className="sm:hidden" aria-label="Open page help">
        <HelpCircle className="w-4 h-4" />
      </Button>

      <Modal open={open} onClose={() => onOpenChange(false)} title={`${help.title} Help`} size="lg">
        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What this page is for</div>
            <p className="mt-2 text-sm leading-6 text-foreground">{help.purpose}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to use it</div>
            <div className="mt-2 space-y-2">
              {help.steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
