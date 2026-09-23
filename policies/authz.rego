package birthhub.authz

default allow = false

allow = true {
    input.role == "PLATFORM_OPERATOR"
}

allow = true {
    input.role == "ADMIN"
}

allow = true {
    input.role == "MANAGER"
}

allow = true {
    input.role == "USER"
    input.userId == input.resourceOwnerId
}

allow = true {
    input.role == "VIEWER"
    input.method == "GET"
}
