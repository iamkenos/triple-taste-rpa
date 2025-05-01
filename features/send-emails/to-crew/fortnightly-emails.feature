Feature: Fortnightly Emails

  Scenario: Fortnightly Pay Advise and Pay Reminder
    Given it's 1 day before end of the pay cycle
    When the service account fetches the payout info for all staff
      And the service account collates the pay advice data
      And the service account sends the fortnightly pay advice email
      And the service account sends the fortnightly pay reminder email
    Then the service account uploads the new pay advices to the drive
