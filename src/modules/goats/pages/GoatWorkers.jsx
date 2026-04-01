import { useEffect, useMemo, useState } from "react";
import ModuleWorkersPage from "@/modules/shared/ModuleWorkersPage.jsx";
import { goatsClient } from "@/modules/goats/services/goatService.js";

export default function GoatWorkers() {
  const [pens, setPens] = useState([]);

  useEffect(() => {
    goatsClient.pens.list().then(setPens);
  }, []);

  const assignmentOptions = useMemo(
    () =>
      pens.map((pen) => ({
        value: pen.id,
        label: pen.name,
      })),
    [pens]
  );

  return (
    <ModuleWorkersPage
      entityName="GoatWorker"
      moduleLabel="Goat Farm"
      assignmentField="pen_id"
      assignmentLabel="Goat Pen"
      assignmentOptions={assignmentOptions}
      defaultRole="Goat Herdsman"
      rolePlaceholder="Goat Herdsman"
    />
  );
}
