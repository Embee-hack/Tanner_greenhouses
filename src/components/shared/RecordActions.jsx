import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RecordActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  extraActions = [],
  align = "end",
  ariaLabel = "Record actions",
}) {
  const hasPrimaryActions = Boolean(onEdit || onDelete);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          aria-label={ariaLabel}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        {extraActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.key || action.label || index}
              onSelect={action.onSelect}
              className={action.destructive ? "text-danger focus:text-danger" : undefined}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {action.label}
            </DropdownMenuItem>
          );
        })}
        {extraActions.length > 0 && hasPrimaryActions ? <DropdownMenuSeparator /> : null}
        {onEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="h-4 w-4" />
            {editLabel}
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem onSelect={onDelete} className="text-danger focus:text-danger">
            <Trash2 className="h-4 w-4" />
            {deleteLabel}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
