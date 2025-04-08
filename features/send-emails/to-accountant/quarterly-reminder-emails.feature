Feature: Quarterly Reminder Emails

  Scenario: Quarterly Expanded Witholding Tax
    Given it's 15 days before the end of:
      | Jan | Apr | Jul | Oct |
    Then the service account sends the quarterly expanded witholding tax reminder email

  Scenario: Quarterly Income Tax
    Given it's 10 days before the 15th of:
      | Feb | May | Aug | Nov |
    Then the service account sends the quarterly income tax reminder email

  Scenario: Quarterly Percentage Tax
    Given it's 25 days before the end of:
      | Jan | Apr | Jul | Oct |
    Then the service account sends the quarterly percentage tax reminder email
