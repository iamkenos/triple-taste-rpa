Feature: SFOS Invoice Extracts

  Scenario: Download & Upload Invoices
    Given the service account logs in to SFOS
    When the service account displays all SFOS entries
     And the service account fetches the list of SFOS invoices from the drive
     And the service account finds new SFOS invoices that hasn't been uploaded to the drive
     And the service account downloads the new SFOS invoices
    Then the service account uploads the new SFOS invoices to the drive
