/**
 * Test utilities for crew completeness logic validation
 * Use this to verify the crew icon red condition works correctly
 */

import { checkEventCrewCompleteness } from './crew-completeness-utils';

// Test cases for crew completeness logic
export const testCrewCompletenessLogic = () => {
  const testCases = [
    {
      name: 'Event without quotation_source_id (manual event)',
      event: {
        id: '1',
        title: 'Manual Wedding Event',
        quotation_source_id: null,
        event_staff_assignments: []
      },
      expected: { isComplete: true, reason: 'No quotation requirements to check' }
    },
    {
      name: 'Event with quotation_source_id but no quotation_details (data not loaded)',
      event: {
        id: '2',
        title: 'Quotation Wedding Event',
        quotation_source_id: 'quote-123',
        quotation_details: null,
        _dataLoaded: true
      },
      expected: { isComplete: false, reason: 'Quotation requirements not available' }
    },
    {
      name: 'Event with data not loaded',
      event: {
        id: '3',
        title: 'Loading Event',
        quotation_source_id: 'quote-123',
        _dataLoaded: false
      },
      expected: { isComplete: false, reason: 'Event data still loading' }
    },
    {
      name: 'Event with complete crew assignments',
      event: {
        id: '4',
        title: 'Complete Crew Event',
        quotation_source_id: 'quote-123',
        quotation_details: {
          days: [
            { photographers: 2, cinematographers: 1, drone: 1, sameDayEditors: 0 }
          ]
        },
        event_staff_assignments: [
          { event_id: '4', role: 'Photographer', day_number: 1 },
          { event_id: '4', role: 'Photographer', day_number: 1 },
          { event_id: '4', role: 'Cinematographer', day_number: 1 },
          { event_id: '4', role: 'Drone Pilot', day_number: 1 }
        ],
        total_days: 1,
        _dataLoaded: true
      },
      expected: { isComplete: true, reason: 'All crew requirements met' }
    },
    {
      name: 'Event with incomplete crew assignments',
      event: {
        id: '5',
        title: 'Incomplete Crew Event',
        quotation_source_id: 'quote-123',
        quotation_details: {
          days: [
            { photographers: 2, cinematographers: 1, drone: 1, sameDayEditors: 1 }
          ],
          sameDayEditing: true
        },
        event_staff_assignments: [
          { event_id: '5', role: 'Photographer', day_number: 1 } // Only 1 photographer, need 2
        ],
        total_days: 1,
        _dataLoaded: true
      },
      expected: { isComplete: false, reason: 'Crew assignments incomplete' }
    }
  ];

  console.log('🧪 Testing Crew Completeness Logic...\n');
  
  testCases.forEach(testCase => {
    const result = checkEventCrewCompleteness(testCase.event);
    const passed = result.isComplete === testCase.expected.isComplete;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected.isComplete} (${testCase.expected.reason})`);
    console.log(`   Got: ${result.isComplete} (${result.reason})`);
    
    if (!passed) {
      console.log('   ❌ TEST FAILED!');
    }
    
    if (result.missingCrew?.length > 0) {
      console.log('   Missing crew:', result.missingCrew);
    }
    
    console.log('');
  });
  
  console.log('🎯 Test Summary: Run this in console to verify logic');
};

// Export for runtime testing
(window as any).testCrewLogic = testCrewCompletenessLogic;