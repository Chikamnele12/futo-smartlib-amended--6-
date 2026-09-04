import React from "react";
import ResourceListPage from "./ResourceListPage";

export default function PastQuestions() {
  return (
    <ResourceListPage
      type="past_question"
      heading="Past Questions"
      crumb="Past Questions"
      searchPlaceholder="Search past questions by course code..."
    />
  );
}
