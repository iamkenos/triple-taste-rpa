Feature: SFOS Invoice Extraction

  Background:
    Given I have a list of latest sfos invoices

  Scenario: Download & Upload
    When I download new sfos invoices
    Then I upload the downloaded files to the drive
