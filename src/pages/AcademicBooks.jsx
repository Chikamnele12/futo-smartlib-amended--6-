import React from "react";
import ResourceListPage from "./ResourceListPage";

export default function AcademicBooks() {
  return (
    <ResourceListPage
      type="academic_book"
      heading="Academic Books"
      crumb="Academic Books"
      searchPlaceholder="Search by title, author, or course code..."
    />
  );
}
