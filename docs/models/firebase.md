
# Firebase

Firebase is a No-SQL database that stores its information as a singular JSON object.
All queries to this database are paths to a specific key in the JSON object.

## Database Models

### User

The User model contains the following information:
- The __nickname__ of the User.
- The __group__ the User is in.

This model is indexed by the User's ID (tends to be human-unreadable).

Key:
```
users/<user_id>
```

Value:
```json
{
	"nickname": "string",
	"group": "string"
}
```

### Tournament

The Tournament model contains the following information:
- The __title__ of the Tournament.
- The __ID of the Game__ the Tournament is for.
- An array of the __User IDs__ of the Users that are in the Tournament.

Key:
```

#### Tournament Info

Tournament
