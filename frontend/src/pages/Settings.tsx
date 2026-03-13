import { useState, useEffect, ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { PageSpinner } from '../components/ui/Spinner'
import { LogOut, Save, Plus } from 'lucide-react'
import Modal from '../components/ui/Modal'

type SettingsTab = 'shop' | 'account' | 'users'

export default function Settings() {

const toast = useToast()
const qc = useQueryClient()
const navigate = useNavigate()

const { user, logout } = useAuthStore()

const [tab,setTab] = useState<SettingsTab>('shop')

const isAdmin = user?.role === 'admin'

/* ---------------- SHOP FORM ---------------- */

const [shopForm,setShopForm] = useState({
name:'',
address:'',
city:'',
state:'',
pincode:'',
phone:'',
email:'',
gstin:'',
currency:'INR'
})

const { data: shopData, isLoading: shopLoading } = useQuery({
queryKey:['shop'],
queryFn: () => api.get('/shop').then(r => r.data),
enabled: tab === 'shop'
})

useEffect(()=>{

if(shopData){

setShopForm({
name:shopData.name || '',
address:shopData.address || '',
city:shopData.city || '',
state:shopData.state || '',
pincode:shopData.pincode || '',
phone:shopData.phone || '',
email:shopData.email || '',
gstin:shopData.gstin || '',
currency:shopData.currency || 'INR'
})

}

},[shopData])

const saveShop = useMutation({

mutationFn: () => api.put('/shop',shopForm),

onSuccess:()=>{
toast('Shop settings saved','success')
qc.invalidateQueries({queryKey:['shop']})
},

onError:(e:any)=>{
toast(e?.response?.data?.error || 'Error','error')
}

})

/* ---------------- PASSWORD ---------------- */

const [pwForm,setPwForm] = useState({
currentPassword:'',
newPassword:'',
confirm:''
})

const changePw = useMutation({

mutationFn: () =>
api.patch('/auth/change-password',{
currentPassword:pwForm.currentPassword,
newPassword:pwForm.newPassword
}),

onSuccess:()=>{
toast('Password changed','success')
setPwForm({currentPassword:'',newPassword:'',confirm:''})
},

onError:(e:any)=>{
toast(e?.response?.data?.error || 'Wrong password','error')
}

})

/* ---------------- USERS ---------------- */

const { data: usersData } = useQuery({
queryKey:['shop-users'],
queryFn: () => api.get('/shop/users').then(r => r.data),
enabled: tab === 'users' && isAdmin
})

const [userOpen,setUserOpen] = useState(false)

const [userForm,setUserForm] = useState({
name:'',
email:'',
password:'',
role:'staff'
})

const addUser = useMutation({

mutationFn: () => api.post('/shop/users',userForm),

onSuccess:()=>{
toast('User added','success')
qc.invalidateQueries({queryKey:['shop-users']})
setUserOpen(false)
setUserForm({name:'',email:'',password:'',role:'staff'})
},

onError:(e:any)=>{
toast(e?.response?.data?.error || 'Error','error')
}

})

/* ---------------- INPUT HELPERS ---------------- */

const SF = (k:string) => (e:ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
setShopForm(p=>({...p,[k]:e.target.value}))

const UF = (k:string) => (e:ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
setUserForm(p=>({...p,[k]:e.target.value}))

/* ---------------- LOGOUT ---------------- */

const doLogout = async () => {

try { await api.post('/auth/logout', {}) } catch {}

logout()

navigate('/login')

}

/* ---------------- UI ---------------- */

return (

<div className="max-w-3xl">

{/* HEADER */}

<div className="flex items-center justify-between mb-5">

<div>

<h2 className="font-serif text-[22px] text-ink">Settings</h2>

<p className="text-[12.5px] text-ink-3">
Manage your shop & account
</p>

</div>

<button
className="btn btn-ghost btn-sm text-coral hover:!border-coral"
onClick={doLogout}
>
<LogOut size={13}/>
Sign Out
</button>

</div>

{/* TABS */}

<div className="tab-bar">

<button
className={`tab-btn ${tab==='shop'?'tab-active':''}`}
onClick={()=>setTab('shop')}
>
🏪 Shop Info
</button>

<button
className={`tab-btn ${tab==='account'?'tab-active':''}`}
onClick={()=>setTab('account')}
>
👤 Account
</button>

{isAdmin && (

<button
className={`tab-btn ${tab==='users'?'tab-active':''}`}
onClick={()=>setTab('users')}
>
👥 Users
</button>

)}

</div>

{/* ---------------- SHOP ---------------- */}

{tab === 'shop' && (

shopLoading
? <PageSpinner/>
: (

<div className="card mt-5">

<div className="font-serif text-[17px] mb-5">
Shop Information
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">

<input className="input" value={shopForm.name} onChange={SF('name')} placeholder="Shop name"/>

<input className="input" value={shopForm.address} onChange={SF('address')} placeholder="Address"/>

<input className="input" value={shopForm.city} onChange={SF('city')} placeholder="City"/>

<input className="input" value={shopForm.state} onChange={SF('state')} placeholder="State"/>

<input className="input" value={shopForm.pincode} onChange={SF('pincode')} placeholder="Pincode"/>

<input className="input" value={shopForm.phone} onChange={SF('phone')} placeholder="Phone"/>

<input className="input" value={shopForm.email} onChange={SF('email')} placeholder="Email"/>

<input className="input" value={shopForm.gstin} onChange={SF('gstin')} placeholder="GSTIN"/>

<select className="input" value={shopForm.currency} onChange={SF('currency')}>
<option>INR</option>
<option>USD</option>
<option>EUR</option>
<option>GBP</option>
<option>AED</option>
</select>

</div>

<button
className="btn btn-teal btn-sm mt-4"
onClick={()=>saveShop.mutate()}
>
<Save size={13}/>
Save Changes
</button>

</div>

)

)}

{/* ---------------- USERS ---------------- */}

{tab==='users' && isAdmin && (

<div className="mt-5">

<div className="flex justify-between mb-4">

<div className="font-serif text-[17px]">
System Users
</div>

<button
className="btn btn-teal btn-sm"
onClick={()=>setUserOpen(true)}
>
<Plus size={13}/>
Add User
</button>

</div>

<div className="card p-0 overflow-hidden">

<table className="tbl">

<thead>
<tr>
<th>Name</th>
<th>Email</th>
<th>Role</th>
</tr>
</thead>

<tbody>

{(usersData || []).map((u:any)=>(
<tr key={u.id}>
<td>{u.name}</td>
<td>{u.email}</td>
<td>{u.role}</td>
</tr>
))}

</tbody>

</table>

</div>

</div>

)}

</div>

)

  }
