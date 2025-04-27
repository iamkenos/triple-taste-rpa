Feature: Update Inventory Management Sheets

  Scenario: Daily Remaining Inventory
    Given it's a day that falls in any of:
      | Tuesday | Wednesday | Thursday | Friday | Saturday |
    When the service account fetches the list of items from the inventory sheet
      And the service account fetches remaining inventory for the day from the ops channel
    Then the service account updates the remaining items on the inventory sheet
