package com.socialnetwork.model;

public enum MessageType {
    TEXT("text"),
    IMAGE("image"),
    VIDEO("video"),
    FILE("file"),
    VOICE("voice");

    private final String value;

    MessageType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MessageType fromValue(String value) {
        for (MessageType type : MessageType.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return TEXT;
    }
}