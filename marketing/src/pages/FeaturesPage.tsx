import React from 'react';
import { Calendar01Icon, UserStoryIcon, Dollar01Icon, UserMultiple02Icon, Invoice01Icon, CheckmarkSquare01Icon, ChartBarLineIcon, MessageNotification01Icon, ConnectIcon, Camera01Icon, Settings02Icon, CloudIcon, SecurityIcon, MobileNavigator01Icon, AnalyticsUpIcon } from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const FeaturesPage = () => {
  const mainFeatures = [
    {
      category: 'Event Management',
      icon: Calendar01Icon,
      features: [
        'Complete wedding & pre-wedding session tracking',
        'Advanced calendar integration with Google Calendar sync',
        'Multi-event scheduling with conflict detection',
        'Client assignment with relationship mapping',
        'Staff assignment with availability checking',
        'Real-time payment tracking and status updates',
        'Event-specific quotations with customizable templates',
        'Timeline management with milestone tracking',
        'Venue management with location details'
      ]
    },
    {
      category: 'Client Relationship Management',
      icon: UserStoryIcon,
      features: [
        'Comprehensive client database with search functionality',
        'Contact information management with multiple numbers',
        'Complete event history tracking and analytics',
        'Payment history with outstanding amount tracking',
        'Communication logs with WhatsApp integration',
        'Automated client notifications and reminders',
        'Family relationship mapping for referral tracking',
        'Client categorization and tagging system',
        'Birthday and anniversary reminder system'
      ]
    },
    {
      category: 'Financial Management & Accounting',
      icon: Dollar01Icon,
      features: [
        'Professional double-entry accounting system',
        'Income and expense tracking with GST compliance',
        'Detailed financial reports (P&L, Balance Sheet, Cash Flow)',
        'Category-wise expense management with receipt storage',
        'GST return preparation (GSTR-1, GSTR-3B)',
        'Tax calculation and advance tax planning',
        'Equipment depreciation tracking',
        'Vendor payment management',
        'Financial analytics with trend analysis'
      ]
    },
    {
      category: 'Team & Staff Management',
      icon: UserMultiple02Icon,
      features: [
        'Multi-role staff management (Admin/Staff/Freelancer)',
        'Photographer, cinematographer, and editor profiles',
        'Comprehensive salary tracking and payment history',
        'Event assignment with role-specific responsibilities',
        'Performance tracking with productivity metrics',
        'Availability scheduling with conflict resolution',
        'Freelancer management with rate tracking',
        'Staff attendance and working hours tracking',
        'Team communication and collaboration tools'
      ]
    },
    {
      category: 'Invoicing & Quotations',
      icon: Invoice01Icon,
      features: [
        'Professional invoice generation with custom branding',
        'Customizable quotation templates with package options',
        'Automated payment reminders with WhatsApp integration',
        'Multiple payment method support (Cash, Online, UPI)',
        'Payment gateway integration for online collections',
        'PDF export with digital signatures',
        'Tax calculations with GST breakdown',
        'Payment schedule management',
        'Receipt generation and tracking'
      ]
    },
    {
      category: 'Task & Workflow Management',
      icon: CheckmarkSquare01Icon,
      features: [
        'Comprehensive task creation and tracking system',
        'Task prioritization with deadline management',
        'Team assignment with workload balancing',
        'Progress monitoring with milestone tracking',
        'Task dependencies and workflow automation',
        'Status updates with real-time notifications',
        'Task templates for recurring workflows',
        'Time tracking and productivity analysis',
        'Performance metrics and team analytics'
      ]
    },
    {
      category: 'Advanced Reporting & Analytics',
      icon: AnalyticsUpIcon,
      features: [
        'Comprehensive business intelligence dashboard',
        'Revenue analytics with seasonal trend analysis',
        'Staff performance metrics and productivity reports',
        'Client acquisition and retention analytics',
        'Event completion rates and profitability analysis',
        'Financial trend analysis with forecasting',
        'Custom report generation with filtering options',
        'Export capabilities (PDF, Excel, CSV)',
        'Automated report scheduling and delivery'
      ]
    },
    {
      category: 'Communication & Integration',
      icon: MessageNotification01Icon,
      features: [
        'WhatsApp Business API integration',
        'Automated client notifications and updates',
        'Staff communication tools with group messaging',
        'Event confirmation and reminder messages',
        'Payment receipt sharing with branded templates',
        'Document sharing capabilities (contracts, invoices)',
        'Email integration for professional communication',
        'SMS notifications for critical updates',
        'Communication analytics and tracking'
      ]
    },
    {
      category: 'Google Sheets Integration',
      icon: ConnectIcon,
      features: [
        'Real-time data synchronization with Google Sheets',
        'Automatic backup of all business data',
        'Custom sheet configuration for different data types',
        'Advanced analytics using Google Sheets functions',
        'Data export for external analysis tools',
        'Collaborative data sharing with team members',
        'Version control and change tracking',
        'Automated report generation in Sheets format',
        'Integration with Google Workspace tools'
      ]
    },
    {
      category: 'Professional Studio Features',
      icon: Camera01Icon,
      features: [
        'Equipment inventory management with maintenance tracking',
        'Shot list creation and management for events',
        'Album design templates and customization',
        'Photo delivery portal for client access',
        'Copyright and watermark management',
        'Pricing calculator for different packages',
        'Venue database with location and facility details',
        'Contract templates and digital signing',
        'Insurance and legal document management'
      ]
    },
    {
      category: 'System Administration',
      icon: Settings02Icon,
      features: [
        'Multi-user access control with role-based permissions',
        'Data backup and recovery systems',
        'Audit trails and activity logging',
        'Custom business rules and workflow automation',
        'Integration API for third-party tools',
        'Mobile app for iOS and Android',
        'Offline functionality with sync capabilities',
        'Multi-location support for studio chains',
        'Custom branding and white-label options'
      ]
    },
    {
      category: 'Security & Compliance',
      icon: SecurityIcon,
      features: [
        'Enterprise-grade data security and encryption',
        'GDPR compliance for data protection',
        'Regular security audits and updates',
        'Secure payment processing with PCI compliance',
        'Data anonymization and privacy controls',
        'Two-factor authentication for enhanced security',
        'Regular automated backups with disaster recovery',
        'Compliance with Indian data protection laws',
        'Secure API access with authentication tokens'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Complete Feature Set for
            <span className="block text-primary">Professional Studios</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover all the powerful features designed specifically for photography and videography businesses. From basic booking to advanced analytics.
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
            <p className="text-primary font-medium text-lg">
              ✨ 100+ Features • 🔄 Real-time Sync • 📱 Mobile Ready • 🔒 Enterprise Security
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mainFeatures.map((category, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-8 border border-border hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <category.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {category.category}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {category.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0"></div>
                      <span className="text-muted-foreground leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Showcase */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Seamless Integrations
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect with the tools and services you already use for maximum efficiency.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border text-center hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <MessageNotification01Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">WhatsApp Business</h3>
              <p className="text-muted-foreground">Professional messaging and automated notifications</p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border border-border text-center hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <ConnectIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Google Sheets</h3>
              <p className="text-muted-foreground">Real-time data sync and advanced analytics</p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border border-border text-center hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Calendar01Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Google Calendar</h3>
              <p className="text-muted-foreground">Seamless event scheduling and team coordination</p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border border-border text-center hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Invoice01Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Payment Gateways</h3>
              <p className="text-muted-foreground">UPI, bank transfers, and online payment methods</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Technical Specifications
            </h2>
            <p className="text-lg text-muted-foreground">
              Built with modern technology stack for reliability, security, and performance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <CloudIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Cloud Infrastructure</h3>
              <p className="text-muted-foreground">99.9% uptime with automatic scaling and global CDN</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <MobileNavigator01Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Mobile First</h3>
              <p className="text-muted-foreground">Responsive design with native mobile apps for iOS and Android</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <SecurityIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Enterprise Security</h3>
              <p className="text-muted-foreground">End-to-end encryption with regular security audits</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;