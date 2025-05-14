Feature: Update Revenue vs Expenses Sheets

  Scenario: Monthly Accounting Fees
    Given it's the 27th of the month
    Then the service account creates expense records for:
      | Accountant  | 2500 | Monthly bank transfer        |
      | Service Fee |   30 | Accountant bank transfer fee |

  Scenario: Monthly Rent Fees
    Given it's the 1st of the month
    Then the service account creates expense records for:
      | Rental | 40550 |

  Scenario: Monthly Storage Fees
    Given it's the 15th of the month
    Then the service account creates expense records for:
      | Rental      | 5000 | Storage rent                   |
      | Service Fee |   30 | Storage rent bank transfer fee |

  Scenario: Fortnightly Staff Wages
    Given it's 1 day before end of the pay cycle
    When the service account fetches the payout info for all staff
      And the service account collates the pay advice data
    Then the service account creates a "Salary Internal" with "Service Fee" expense record for each pay advise

  Scenario: Weekly Mobile Data Charges
    Given it's a Sunday
    Then the service account creates expense records for:
      | Mobile Data | 99 | Ops sim load               |
      | Service Fee |  2 | Gcash sim load service fee |

  Scenario: Weekly Gcash Transfer Charges
    Given it's a Sunday
    Then the service account creates expense records for:
      | Service Fee | 15 | Gcash weekly transfer service fee |

  Scenario: Daily Revenue Offset
    Given it's a week day
    When the service account fetches the sales figures for the previous working day
      And the service account computes the data to invoice
    Then the service account creates an invoice record for the computed data
