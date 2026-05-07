import { Helmet } from "react-helmet-async";
import Services from "./Services";

export default function ServicesPage() {
  return (
    <>
      <Helmet>
        <title>Cleaning Services London | Regular, Deep & End of Tenancy | London Cleaning Wizard</title>
        <meta name="description" content="Browse our full range of London cleaning services: regular home cleans, deep cleans, end of tenancy, Airbnb, office and commercial cleaning. Vetted, insured & reliable." />
        <link rel="canonical" href="https://londoncleaningwizard.com/services" />
      </Helmet>
      <div style={{ paddingTop: 68 }}>
        <Services />
      </div>
    </>
  );
}
