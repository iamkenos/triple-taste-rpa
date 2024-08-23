Feature: SFOS Invoice Extraction

  Background:
    Given I have a list of latest sfos invoices

  Scenario: Download & Upload
    When I login to sfos
     And I download new sfos invoices
    Then I upload the downloaded sfos invoices to the drive
