import { useEffect, useMemo, useState } from "react";
import ModuleWorkersPage from "@/modules/shared/ModuleWorkersPage.jsx";
import { poultryClient } from "@/modules/poultry/services/poultryService.js";

export default function PoultryWorkers() {
  const [houses, setHouses] = useState([]);

  useEffect(() => {
    poultryClient.houses.list().then(setHouses).catch(() => setHouses([]));
  }, []);

  const assignmentOptions = useMemo(
    () =>
      houses.map((house) => ({
        value: house.id,
        label: house.name,
      })),
    [houses]
  );

  return (
    <ModuleWorkersPage
      entityName="PoultryWorker"
      moduleLabel="Poultry"
      assignmentField="poultry_house_id"
      assignmentLabel="Poultry House"
      assignmentOptions={assignmentOptions}
      defaultRole="Poultry Supervisor"
      rolePlaceholder="Poultry Supervisor"
    />
  );
}
