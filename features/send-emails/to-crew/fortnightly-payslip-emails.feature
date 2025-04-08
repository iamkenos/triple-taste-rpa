Feature: Fortnightly Pay Advise Emails

  Scenario: Daily Invoicing
    Given it's 1 day before end of the pay cycle
    When the service account fetches the payout info for all staff
      And the service account collates the pay advice data
      And the service account sends the fortnightly pay advice email
      And the service account sends the fortnightly pay reminder email
      And the service account uploads the new pay advices to the drive
    Then the service account creates a "Salary Internal" expense record for each pay advise
