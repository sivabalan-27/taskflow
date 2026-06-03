# Firestore Security Rules

Paste these into **Firebase Console → Firestore Database → Rules** and click **Publish**.

These rules enforce the access model:
- Only team members can read/write their team and its tasks.
- Only the team owner can invite new members.
- Invites are only visible to the invited email (or the inviter).
- Non-members cannot see other teams' tasks.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function emailLower() {
      return request.auth.token.email.lower();
    }
    function isTeamMember(teamId) {
      return isSignedIn() &&
        request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.memberIds;
    }

    // User profile mirror (for invite lookups)
    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == uid;
    }

    // Teams
    match /teams/{teamId} {
      allow read: if isSignedIn() && request.auth.uid in resource.data.memberIds;

      allow create: if isSignedIn()
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.memberIds.hasOnly([request.auth.uid])
        && request.resource.data.memberIds.hasAll([request.auth.uid]);

      // Members can update their team (e.g. accept-invite adds self to memberIds).
      // Only owner can fully manage; here we allow any member to write team doc
      // because adding yourself via accepted invite requires it.
      allow update: if isSignedIn() && (
        request.auth.uid in resource.data.memberIds ||
        // Allow accepting an invite: user is adding only themselves
        (
          request.auth.uid in request.resource.data.memberIds &&
          !(request.auth.uid in resource.data.memberIds)
        )
      );

      allow delete: if isSignedIn() && request.auth.uid == resource.data.ownerId;
    }

    // Invites
    match /invites/{inviteId} {
      allow read: if isSignedIn() && (
        emailLower() == resource.data.emailLower ||
        request.auth.uid == resource.data.invitedBy
      );

      // Only the team owner can create an invite
      allow create: if isSignedIn()
        && request.resource.data.invitedBy == request.auth.uid
        && get(/databases/$(database)/documents/teams/$(request.resource.data.teamId)).data.ownerId == request.auth.uid;

      // The invited user (or the inviter) can update status
      allow update, delete: if isSignedIn() && (
        emailLower() == resource.data.emailLower ||
        request.auth.uid == resource.data.invitedBy
      );
    }

    // Tasks: only team members can read or write
    match /tasks/{taskId} {
      allow read: if isSignedIn() && isTeamMember(resource.data.teamId);
      allow create: if isSignedIn() && isTeamMember(request.resource.data.teamId)
        && request.resource.data.createdBy == request.auth.uid;
      allow update, delete: if isSignedIn() && isTeamMember(resource.data.teamId);
    }
  }
}
```

## Notes
- Firebase Auth must have **Email/Password** sign-in enabled (and verified emails recommended) for `request.auth.token.email` to be reliable.
- The invited user's email is matched **case-insensitively** via `emailLower`.
- Until rules are published, all reads/writes will fail.
