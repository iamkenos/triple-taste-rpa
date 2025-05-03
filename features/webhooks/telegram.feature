Feature: Telegram Webhook RPA

  @update_inventory
  Scenario: Daily Remaining Inventory
    When the service account fetches the list of items from the inventory sheet
      And the service account parses remaining inventory for the day from the ops channel
    Then the service account updates the remaining items on the inventory sheet

  @fetch_deposit_amount
  Scenario: Fetch Deposit Amount for the Day
    When the service account fetches the expected deposit amount for the day
    Then the service account sends the expected deposit amount on the channel

  @fetch_shift_rotation
  Scenario: Shift Rotation
    When the service account fetches the next pay cycle shift info for all staff
      And the service account collates the shift rotation data
    Then the service account sends the fortnightly shift rotation announcement
