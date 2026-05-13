"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Thread } from "@/lib/chat-types"

export type DeleteThreadDialogProps = {
  threadPendingDelete: Thread | null
  dismissDeleteDialog: () => void
  confirmDeleteThread: () => void
}

export function DeleteThreadDialog({
  threadPendingDelete,
  dismissDeleteDialog,
  confirmDeleteThread,
}: DeleteThreadDialogProps) {
  return (
    <AlertDialog
      open={threadPendingDelete !== null}
      onOpenChange={(open) => {
        if (!open) dismissDeleteDialog()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete{" "}
            {threadPendingDelete
              ? `“${threadPendingDelete.title}”`
              : "this chat"}{" "}
            permanently?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This conversation will be removed from your history. You cannot undo
            this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={confirmDeleteThread}>
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
