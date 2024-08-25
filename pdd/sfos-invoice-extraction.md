# SFOS Invoice Extraction

## Process Summary

Downloads sales invoices from the SFOS v2 application and upload these on a drive folder.

## Process Steps

> Start

1. Connect to the drive and look for the `Q` folder of the current day.

   - If the folder doesnt exist, create a new folder.

2. Note down all the files uploaded under the identified `Q` folder and filter files that matches the SFOS invoice naming convention.

3. Login to the SFOS v2 application.

4. Show all invoices and look for rows that are dated for this quarter.

5. Compare the files dated for this quarter that available for download against the files that are already uploaded.

   - If there are no files to download, terminate process. Else, download the delta.

6. Upload the newly downloaded files back to the folder from step 1.

> End
