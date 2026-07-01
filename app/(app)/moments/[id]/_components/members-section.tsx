'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { type MomentDetail, type MomentMemberFull } from '../actions'
import { MemberRow } from './member-row'
import { InviteDialog } from './invite-member-dialog'
import { InviteLinkSection } from './invite-link-panel'
import { TransferOwnershipSection } from './transfer-ownership-section'
import { LeaveSection, DeleteMomentSection, ReaderView } from './member-danger-zone'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
  myUserId: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MembersSection({ moment, myRole, myStatus, myUserId }: Props) {
  // Readers see only the danger zone with a simple leave button
  if (myRole === 'reader' && myStatus === 'accepted') {
    return <ReaderView momentId={moment.id} />
  }

  const isAccepted = myStatus === 'accepted'
  const isOwner = myRole === 'owner'
  const canManageLink = isAccepted && (isOwner || myRole === 'editor')

  const nonOwnerMembers = moment.members.filter((m) => m.userId !== moment.ownerId)
  const acceptedEditors = nonOwnerMembers.filter(
    (m) => m.role === 'editor' && m.status === 'accepted'
  )

  const owner: MomentMemberFull = {
    id: '__owner__',
    userId: moment.ownerId,
    firstName: moment.ownerFirstName,
    lastName: moment.ownerLastName,
    photoUrl: moment.ownerPhotoUrl,
    invitedEmail: null,
    role: 'editor',
    status: 'accepted',
    invitedBy: null,
  }

  const sortByName = (a: MomentMemberFull, b: MomentMemberFull) =>
    `${a.firstName} ${a.lastName}`.toLowerCase()
      .localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase())

  const sortedEditors = [...nonOwnerMembers.filter((m) => m.role === 'editor')].sort(sortByName)
  const sortedReaders = [...nonOwnerMembers.filter((m) => m.role === 'reader')].sort(sortByName)

  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-4 space-y-8 pb-12">

      {/* ── Section 1: Manage Members ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">
            Manage Members
          </h2>
          {isAccepted && (isOwner || myRole === 'editor') && (
            <InviteDialog momentId={moment.id} myRole={myRole} />
          )}
        </div>

        <ul className="space-y-2.5">
          {/* Owner row — no edit icon */}
          <MemberRow
            member={owner}
            isOwnerRow
            showEditMenu={false}
            momentId={moment.id}
          />
          {/* Editors (alphabetical) */}
          {sortedEditors.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isOwnerRow={false}
              showEditMenu={isOwner && m.userId !== myUserId}
              momentId={moment.id}
            />
          ))}
          {/* Readers (alphabetical) */}
          {sortedReaders.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isOwnerRow={false}
              showEditMenu={isOwner && m.userId !== myUserId}
              momentId={moment.id}
            />
          ))}
        </ul>
      </section>

      <Separator />

      {/* ── Section 2: Invite Link (owners + editors) ─────────── */}
      {canManageLink && (
        <>
          <section>
            <InviteLinkSection momentId={moment.id} initialLink={moment.inviteLink} />
          </section>
          <Separator />
        </>
      )}

      {/* ── Section 3: Transfer Ownership (owner only) ────────── */}
      {isOwner && isAccepted && (
        <>
          <section className="space-y-4">
            <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">
              Transfer Ownership
            </h2>
            {acceptedEditors.length > 0 ? (
              <TransferOwnershipSection momentId={moment.id} editors={acceptedEditors} />
            ) : (
              <p className="text-sm text-rw-text-muted">
                You must promote a reader to editor before you can transfer ownership.
              </p>
            )}
          </section>
          <Separator />
        </>
      )}

      {/* ── Section 4: Leave / Delete (danger zone) ───────────── */}
      {isAccepted && (
        <section className="rounded-rw-card border border-rw-danger/40 bg-rw-danger-subtle/40 py-5 px-6 space-y-4">
          <h2 className="font-sans text-[11px] font-semibold text-rw-danger uppercase tracking-[0.08em]">
            Danger Zone
          </h2>

          {!isOwner ? (
            /* Editor / Reader — leave with post choice */
            <LeaveSection momentId={moment.id} />
          ) : acceptedEditors.length > 0 ? (
            /* Owner with editors — must transfer first */
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Leave moment</p>
                <p className="text-sm text-rw-text-muted mt-1">
                  To leave this moment, you must first transfer ownership to an editor using
                  the Transfer Ownership section above.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-rw-danger/40 text-rw-danger/50"
                disabled
              >
                <LogOut className="size-3.5" />
                Leave moment
              </Button>
            </div>
          ) : (
            /* Owner without editors — can delete moment */
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Leave moment</p>
                <p className="text-sm text-rw-text-muted mt-1">
                  You cannot leave this moment without an editor to transfer ownership to. You can
                  promote a reader to editor in the Manage Members section above and then transfer
                  ownership, or you can delete this moment for everyone.
                </p>
              </div>
              <DeleteMomentSection momentId={moment.id} momentName={moment.name} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}
