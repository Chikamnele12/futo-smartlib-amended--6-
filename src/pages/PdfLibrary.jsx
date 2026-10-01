import React from "react";
import ResourceListPage from "./ResourceListPage";

export default function PdfLibrary() {
  return (
    <ResourceListPage
      type="pdf"
      heading="PDF Library"
      crumb="PDF Library"
      searchPlaceholder="Search PDF documents..."
    />
  );
}
