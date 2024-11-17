Feature: SFOS Invoice Extraction

  Scenario: Download & Upload
  Process:
  - get all uploaded files on all drive folders
  - get all uploaded file on sfos
  - download the new invoices
  - upload new files on their respective Q folders, create folder if not existing

    Given I have the list of uploaded sfos invoices
    When I login to sfos
     And I download new sfos invoices
    Then I upload the downloaded sfos invoices to the drive
