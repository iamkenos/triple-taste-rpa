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
      And the service account reverts the master formula references on inventory sheet
    Then the service account sends order confirmation on the channel

  @fetch_deposit_amount
  Scenario: Fetch Deposit Amount for the Day
    When the service account fetches the expected deposit amount for the day
    Then the service account sends the expected deposit amount on the channel

  @fetch_shift_rotation
  Scenario: Fetch Shift Rotation
    When the service account fetches the shift info for all staff
      And the service account collates the shift rotation data
    Then the service account sends the fortnightly shift rotation announcement

  @update_inventory
  Scenario: Update Daily Remaining Inventory
    When the service account fetches the list of items from the inventory sheet
      And the service account parses remaining inventory for the day from the ops channel
    Then the service account updates the remaining items on the inventory sheet
