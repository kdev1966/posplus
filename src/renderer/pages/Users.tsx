import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { User } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'

export const Users: React.FC = () => {
  const { t } = useLanguageStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleId: '1',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await window.api.getAllUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
    setLoading(false)
  }

  const getRoleBadgeVariant = (roleId: number) => {
    switch (roleId) {
      case 3: // Admin
        return 'danger' as const
      case 2: // Manager
        return 'warning' as const
      default: // Cashier
        return 'info' as const
    }
  }

  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 3:
        return t('administrator')
      case 2:
        return t('manager')
      case 1:
      default:
        return t('cashier')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddClick = () => {
    setIsEditMode(false)
    setEditingUserId(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roleId: '1',
    })
    setIsModalOpen(true)
  }

  const handleEditClick = (user: User) => {
    setIsEditMode(true)
    setEditingUserId(user.id)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for security
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId?.toString() || '1',
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = async (userId: number, username: string) => {
    if (!confirm(`${t('confirm')} ${t('delete')} ${username}?`)) {
      return
    }

    try {
      await window.api.deleteUser(userId)
      alert(`Utilisateur ${username} supprimé avec succès`)
      loadUsers()
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(`Erreur: ${error?.message || 'Échec de la suppression'}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isEditMode && editingUserId) {
        // Update user
        const updateData: any = {
          id: editingUserId,
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleId: parseInt(formData.roleId),
        }

        // Only include password if it was changed
        if (formData.password.trim()) {
          updateData.password = formData.password
        }

        await window.api.updateUser(updateData)
        alert('Utilisateur modifié avec succès')
      } else {
        // Create new user
        const newUser = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleId: parseInt(formData.roleId),
        }

        await window.api.createUser(newUser)
        alert('Utilisateur créé avec succès')
      }

      setIsModalOpen(false)
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        roleId: '1',
      })
      loadUsers()
    } catch (error: any) {
      console.error('Failed to save user:', error)
      alert(`Erreur: ${error?.message || 'Échec de l\'enregistrement'}`)
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('usersTitle')}</h1>
            <p className="text-gray-400">{t('manageUserAccounts')}</p>
          </div>
          <Button variant="primary" onClick={handleAddClick}>
            + {t('addUser')}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('firstName')}</th>
                    <th>{t('username')}</th>
                    <th>{t('role')}</th>
                    <th>{t('status')}</th>
                    <th>{t('lastLogin')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center text-xl">
                            👤
                          </div>
                          <div>
                            <div className="font-semibold text-white">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{user.username}</td>
                      <td>
                        <Badge variant={getRoleBadgeVariant(user.roleId || 1)}>
                          {getRoleName(user.roleId || 1)}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={user.isActive ? 'success' : 'danger'}>
                          {user.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td className="text-sm text-gray-400">
                        {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="text-primary-400 hover:text-primary-300"
                            onClick={() => handleEditClick(user)}
                          >
                            {t('edit')}
                          </button>
                          <button
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteClick(user.id, user.username)}
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!loading && users.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-white mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-gray-400">Ajoutez des utilisateurs pour gérer l'accès au système</p>
            </div>
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditMode ? `${t('edit')} ${t('usersTitle')}` : t('addUser')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {isEditMode ? t('save') : t('add')}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('firstName')}
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('lastName')}
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            <Input
              label={t('username')}
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            <Input
              label={t('email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <Input
              label={`${t('password')}${isEditMode ? ' (laisser vide pour ne pas changer)' : ''}`}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required={!isEditMode}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">{t('role')}</label>
              <select
                name="roleId"
                value={formData.roleId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="1">{t('cashier')}</option>
                <option value="2">{t('manager')}</option>
                <option value="3">{t('administrator')}</option>
              </select>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
