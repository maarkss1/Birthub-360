package birthhub.authz

default allow = false

# Allow if user is ADMIN
allow = true {
    input.role == "ADMIN"
}

# Allow if user is accessing their own data
allow = true {
    input.role == "USER"
    input.userId == input.resourceOwnerId
}
