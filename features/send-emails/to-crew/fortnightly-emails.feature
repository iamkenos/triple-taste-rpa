Feature: Fortnightly Emails

  Scenario: Fortnightly Pay Advise and Pay Reminder
    Given it's 1 day before end of the pay cycle
    When the service account fetches the payout info for all staff
      And the service account collates the pay advice data
      And the service account sends the fortnightly pay advice email
      And the service account sends the fortnightly pay reminder email
    Then the service account uploads the new pay advices to the drive

  Scenario: Fortnightly Schedule Update
    Given it's 5 days before end of the pay cycle
    When the service account fetches the shift info for all staff
      And the service account collates the shift rotation data
      And the service account sends the fortnightly shift rotation email
    Then the service account sends the fortnightly shift rotation announcement on the ops channel
