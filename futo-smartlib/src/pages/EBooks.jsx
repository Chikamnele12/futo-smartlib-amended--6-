import React from "react";
import ResourceListPage from "./ResourceListPage";

export default function EBooks() {
  return (
    <ResourceListPage
      type="ebook"
      heading="eBooks"
      crumb="eBooks"
      searchPlaceholder="Search eBooks by title or author..."
    />
  );
}
