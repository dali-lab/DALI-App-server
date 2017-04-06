# DALI Lab app server
Copyright (c) 2017 DALI Lab All Rights Reserved.

A server written in ExpressJS and connecting to MongoDB that coordinates simple data for the DALI Lab app.

## Environment variables
- PORT (Int)
  - The port on which the server should run
  - eg. 3000
- DB_URI (String)
  - The URI connection string (with authorization credentials) of the database to be used
  - eg. mongodb://test:test@localhost:51820/test
  - Format:
  > mongodb://[{username}:{password}@]{hostname}[:{port}]/{dbname}

## Functions
##### enterExit
Called upon entering or exiting the DALI lab (and when some settings are changed)

Sample req.params:
```json
{
 "user": {
    "email": "some.name@dali.dartmouth.edu",
    "id": "123456789012345678901",
    "familyName": "Name",
    "givenName": "Some",
    "name": "Some Name"
 },
 "inDALI": false,
 "share": false
}
```

##### checkIn
Check the passed user into any event going on currently

PARAMETERS:
```json
{
 "user": {
   "name": "Some Name",
   "id": "123456789012345678901",
   "email": "some.name@dali.dartmouth.edu"
 },
 "beacon": {
   "major": 0,
   "minor": 1
 }
}
```

NOTE: ATM doesn't do anything


##### sharedUsersLocation
Get a list of users in the lab who share their location

RETURNS:
```json
[
 {
   "email": "some.name@dali.dartmouth.edu",
   "name": "Some Name",
   "inDALI": false,
   "shared": false
 }
]
```

##### timLocation
Post Tim's current location

PARAMETERS:
```json
{
 "location": "OFFICE",
  "enter": true
}
```

TODO: Update to authenticate that tim is sending.

##### timLocation
Get Tim's last known location

RETURNS:
```json
{
  "inDALI": false,
  "inOffice": false,
}
```

## Todo
- Write check in handling
- Authenticate Tim on timLocation
