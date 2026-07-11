package com.flowforge.workspace.dto;

import jakarta.validation.constraints.NotNull;

public record TransferOwnershipRequest(@NotNull Long newOwnerUserId) {
}
