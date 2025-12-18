The goal is to create a script to convert a CSV file into a JSON
array. The script must be written in TypeScript. 

The first line of the CSV file contains 
```
"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"
```

Take care that some `Notes` values are multi-line.

Each CSV record will be converted into a JSON object such as 
```
{ "group", "",
  "title": "", 
  "username": "",
  "password": "",
  "site": "",
  "tags": [ "", ... ],
  "notes": "",
  "created": 123,
  "modified": 123
}
 ```
The `URL` field will be stored in the `site` property.
The `tags` property is to be filled with the value of the `Group` 
field as follows:
- ignore lines containing `keepass/Archive` 
- suppress the `keepass` prefix
- use slashes to split the resulting value
- use the remaining words as individual tags.

Test files should be written using the Jasmine framework.
Check that tests run well.


 

