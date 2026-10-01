import React from "react";
import ResourceListPage from "./ResourceListPage";

export default function RevisionNotes() {
  return (
    <ResourceListPage
      type="revision_note"
      heading="Revision Notes"
      crumb="Revision Notes"
      searchPlaceholder="Search revision notes..."
    />
  );
}
