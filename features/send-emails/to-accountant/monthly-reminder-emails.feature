Feature: Monthly Reminder Emails

  Scenario: Monthly Expanded Witholding Tax
    Given it's 5 days before the 10th of:
      | Feb | May | Aug | Nov |
      | Mar | Jun | Sep | Dec |
    Then the service account sends the monthly expanded witholding tax reminder email

  Scenario: Monthly Bookkeeping
    Given it's the 3rd of the month
    Then the service account sends the monthly bookkeeping reminder email

  @ignore
  Scenario: Monthly Staffing Agency 2307 Request
    Given it's 3 days before the end of month
    Then the service account sends the monthly staffing agency 2307 request email
