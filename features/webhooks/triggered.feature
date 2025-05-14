Feature: Webhook Triggered Processes

  @create_order
  Scenario: Create PC Order
    Given the service account fetches the order details from the inventory sheet
    When the service account logs in to OOS
      And the service account adds each product to order in the OOS cart
      And the service account views the OOS cart and checks out
      And the service account completes the OOS order
      And the service account extracts the OOS order details
      And the service account updates the ordered and arriving items on the inventory sheet
      And the service account creates an expense record for the newly created order
      And the service account reverts the master formula references on the inventory sheet
    Then the service account sends the order confirmation on the ops channel

  @fetch_deposit_amount
  Scenario: Fetch Deposit Amount for the Day
    When the service account fetches the expected deposit amount for the day
    Then the service account sends the expected deposit amount on the ops channel

  @fetch_shift_rotation
  Scenario: Fetch Shift Rotation
    When the service account fetches the shift info for all staff
      And the service account collates the shift rotation data
    Then the service account sends the fortnightly shift rotation announcement on the ops channel

  @update_inventory
  Scenario: Update Daily Remaining Inventory
    When the service account fetches the list of items from the inventory sheet
      And the service account gets remaining inventory from the webhook message
      And the service account updates the remaining items on the inventory sheet
      And the service account fetches the remaining items for the previous working day from the inventory sheet
      And the service account fetches the usage items for the previous working day from the inventory sheet
    Then the service account hides the columns for the previous days on the inventory sheet
      And the service account sends the inventory update confirmation on the ops channel
