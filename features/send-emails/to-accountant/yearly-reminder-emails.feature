Feature: Yearly Reminder Emails

  Scenario: Yearly Expanded Witholding Tax
    Given it's 20 days before the end of Mar
    Then the service account sends the yearly expanded witholding tax reminder email

  Scenario: Yearly Income Tax
    Given it's 20 days before the 15th of Apr
    Then the service account sends the yearly income tax reminder email
