Feature: Daily Revenue Emails

  Scenario: Daily Invoicing
    Given it's a week day
    When the service account fetches the sales figures for the previous working day
      And the service account computes the data to invoice
    Then the service account sends the daily invoicing email
