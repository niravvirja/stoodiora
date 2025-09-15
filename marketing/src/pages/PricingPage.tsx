import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);

  const features = [
    "Complete Event Management & Scheduling",
    "Client Database & Communication Tools", 
    "Financial Tracking & Expense Management",
    "Staff & Freelancer Management",
    "Invoice & Quotation Generation",
    "WhatsApp Integration & Notifications",
  ];

  const monthlyPlan = {
    name: "Monthly Plan",
    price: "₹749",
    period: "/month",
  };

  const yearlyPlan = {
    name: "Yearly Plan", 
    price: "₹8,199",
    period: "/year",
    originalPrice: "₹8,988",
    savings: "₹789",
  };

  const additionalFeatures = [
    "Secure cloud storage with automatic backups",
    "Mobile-responsive design for on-the-go management",
    "Regular feature updates and improvements",
    "Data export capabilities",
    "Compliance with data protection regulations",
    "99.9% uptime guarantee",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Simple, Transparent
            <span className="block text-primary">Pricing for Stoodiora</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose the perfect plan for your studio. All plans include our core
            features with no hidden fees.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="bg-muted rounded-lg p-1 flex items-center">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-300 ${
                  !isYearly
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-md font-medium transition-all duration-300 ${
                  isYearly
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Flip Card */}
          <div className="flex justify-center">
            <div className="perspective-1000 w-full max-w-md">
              <div
                className={`relative w-full min-h-[500px] transition-transform duration-700 transform-style-preserve-3d ${
                  isYearly ? "" : "rotate-y-180"
                }`}
              >
                {/* Front Side - Yearly Plan */}
                <div className="absolute inset-0 backface-hidden w-full h-full rounded-lg border-2 p-8 border-primary bg-primary/5">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {yearlyPlan.name}
                    </h3>
                    <div className="mb-4">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-lg text-muted-foreground line-through">
                          {yearlyPlan.originalPrice}
                        </span>
                        <span className="text-sm bg-success/20 text-success px-2 py-1 rounded-full font-medium">
                          Save {yearlyPlan.savings}
                        </span>
                      </div>
                      <span className="text-4xl font-bold text-foreground">
                        {yearlyPlan.price}
                      </span>
                      <span className="text-muted-foreground">
                        {yearlyPlan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/contact"
                    className="block w-full text-center py-3 px-4 rounded-md font-medium transition-all duration-300 transform bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg"
                  >
                    Get Started
                  </Link>
                </div>

                {/* Back Side - Monthly Plan */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full rounded-lg border-2 p-8 border-border bg-card">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {monthlyPlan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-foreground">
                        {monthlyPlan.price}
                      </span>
                      <span className="text-muted-foreground">
                        {monthlyPlan.period}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {monthlyPlan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/contact"
                    className="block w-full text-center py-3 px-4 rounded-md font-medium transition-all duration-300 transform bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary hover:shadow-lg"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What's Included in All Plans
            </h2>
            <p className="text-lg text-muted-foreground">
              Every plan comes with these essential features at no extra cost.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect at the next billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Is there a free trial?
              </h3>
              <p className="text-muted-foreground">
                Yes, we offer a 3-day free trial for all plans. No credit card
                required to start.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground">
                We accept UPI, bank transfers, credit cards, and debit cards.
                All payments are processed securely.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Do you offer custom integrations?
              </h3>
              <p className="text-muted-foreground">
                Custom integrations are available according to your needs.
                Contact us to discuss your specific requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
