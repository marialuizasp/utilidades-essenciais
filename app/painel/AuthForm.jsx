'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {getSupabase} from '@/lib/supabaseClient';
import styles from './painel.module.css';
export default function AuthForm({mode}){
 const router=useRouter(),signup=mode==='signup';
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const client=getSupabase();
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');const result=signup?await client.auth.signUp({email,password,options:{data:{name}}}):await client.auth.signInWithPassword({email,password});setBusy(false);if(result.error){setMessage('Não foi possível continuar. Confira seus dados e tente novamente.');return;}if(signup){setMessage('Cadastro recebido! Confirme seu e-mail, caso solicitado.');return;}router.push('/painel/produtos');router.refresh();}
 return <form className={styles.fields} onSubmit={submit}>
 {!client&&<p role="status">Conecte o Supabase na Vercel para ativar esta página.</p>}
 {signup&&<label className={styles.field}>Seu nome<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} disabled={!client||busy}/></label>}
 <label className={styles.field}>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={!client||busy}/></label>
 <label className={styles.field}>Senha{signup?' (mínimo 8 caracteres)':''}<input type="password" required minLength={signup?8:undefined} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} disabled={!client||busy}/></label>
 {message&&<p role="status">{message}</p>}
 <button className={styles.primaryButton} disabled={!client||busy}>{busy?'Aguarde…':signup?'Criar conta':'Entrar'}</button>
 </form>;
}
