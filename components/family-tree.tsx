'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Users, 
  Baby,
  Heart,
  UserCheck,
  UserX
} from 'lucide-react'
import { Dependant, Member } from '@/lib/types'
import { formatDate, calculateAge } from '@/lib/utils'

interface FamilyTreeProps {
  member: Member
  dependants: Dependant[]
  onAddDependant: (dependant: Omit<Dependant, 'id' | 'created_at'>) => Promise<void>
  onUpdateDependant: (id: string, updates: Partial<Dependant>) => Promise<void>
  onDeleteDependant: (id: string) => Promise<void>
}

export function FamilyTree({ 
  member, 
  dependants, 
  onAddDependant, 
  onUpdateDependant, 
  onDeleteDependant 
}: FamilyTreeProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDependant, setEditingDependant] = useState<Dependant | null>(null)
  const [newDependant, setNewDependant] = useState({
    name: '',
    relationship: 'child' as Dependant['relationship'],
    dob: '',
    notes: ''
  })

  const handleAddDependant = async () => {
    if (!newDependant.name.trim()) return

    await onAddDependant({
      member_id: member.id,
      first_name: newDependant.name,
      relationship: newDependant.relationship,
      dob: newDependant.dob || undefined,
      notes: newDependant.notes,
      updated_at: new Date().toISOString()
    })

    setNewDependant({ name: '', relationship: 'child', dob: '', notes: '' })
    setIsAddDialogOpen(false)
  }

  const handleUpdateDependant = async () => {
    if (!editingDependant || !editingDependant.first_name.trim()) return

    await onUpdateDependant(editingDependant.id, {
      first_name: editingDependant.first_name,
      relationship: editingDependant.relationship,
      dob: editingDependant.dob || undefined,
      notes: editingDependant.notes || undefined,
      updated_at: new Date().toISOString()
    })

    setEditingDependant(null)
  }

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'child':
        return <Baby className="h-4 w-4" />
      case 'spouse':
        return <Heart className="h-4 w-4" />
      case 'sibling':
        return <Users className="h-4 w-4" />
      case 'parent':
        return <UserCheck className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'child':
        return 'bg-brand-50 text-brand-700 dark:bg-brand-400/10 dark:text-brand-300'
      case 'spouse':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'
      case 'sibling':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300'
      case 'parent':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300'
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-300'
    }
  }

  const groupedDependants = dependants.reduce((acc, dependant) => {
    if (!acc[dependant.relationship]) {
      acc[dependant.relationship] = []
    }
    acc[dependant.relationship].push(dependant)
    return acc
  }, {} as Record<string, Dependant[]>)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Family Members</span>
            </CardTitle>
            <CardDescription>
              Manage your family members and dependants
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
                <DialogDescription>
                  Add a new family member or dependant to your profile.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newDependant.name}
                    onChange={(e) => setNewDependant({ ...newDependant, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <select
                    id="relationship"
                    value={newDependant.relationship}
                    onChange={(e) => setNewDependant({ ...newDependant, relationship: e.target.value as Dependant['relationship'] })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="parent">Parent</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth (Optional)</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={newDependant.dob}
                    onChange={(e) => setNewDependant({ ...newDependant, dob: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={newDependant.notes}
                    onChange={(e) => setNewDependant({ ...newDependant, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDependant}>
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {dependants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">No family members added yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Member
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDependants).map(([relationship, members]) => (
              <div key={relationship}>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 capitalize">
                  {relationship}s ({members.length})
                </h4>
                <div className="grid gap-3">
                  {members.map((dependant) => (
                    <div key={dependant.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 dark:border-white/10">
                      <div className="flex min-w-0 items-center space-x-3">
                        <div className={`p-2 rounded-full ${getRelationshipColor(dependant.relationship)}`}>
                          {getRelationshipIcon(dependant.relationship)}
                        </div>
                        <div>
                          <p className="font-medium">{dependant.first_name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                            <span className="capitalize">{dependant.relationship}</span>
                            {dependant.dob && (
                              <span>Age {calculateAge(dependant.dob)}</span>
                            )}
                            {dependant.membership_id && (
                              <span>ID: {dependant.membership_id}</span>
                            )}
                          </div>
                          {dependant.notes && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{dependant.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 w-11 px-0 sm:h-9 sm:w-9"
                          aria-label={`Edit ${dependant.first_name}`}
                          onClick={() => setEditingDependant(dependant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteDependant(dependant.id)}
                          aria-label={`Remove ${dependant.first_name}`}
                          className="h-11 w-11 px-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 sm:h-9 sm:w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingDependant && (
          <Dialog open={!!editingDependant} onOpenChange={() => setEditingDependant(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Family Member</DialogTitle>
                <DialogDescription>
                  Update the details for {editingDependant.first_name}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingDependant.first_name}
                    onChange={(e) => setEditingDependant({ ...editingDependant, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-relationship">Relationship</Label>
                  <select
                    id="edit-relationship"
                    value={editingDependant.relationship}
                    onChange={(e) => setEditingDependant({ ...editingDependant, relationship: e.target.value as Dependant['relationship'] })}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="parent">Parent</option>
                    <option value="guardian">Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editingDependant.dob || ''}
                    onChange={(e) => setEditingDependant({ ...editingDependant, dob: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editingDependant.notes || ''}
                    onChange={(e) => setEditingDependant({ ...editingDependant, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDependant(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateDependant}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
