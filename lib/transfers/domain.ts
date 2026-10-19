import { z } from 'zod';
export const DESTINATIONS = ['Cartagena','Santa Marta','San Andrés','Palomino','Barú'] as const;
export const STATUSES = ['Pendiente','En gestión','Confirmado','Cancelado'] as const;
const clean=(max=120)=>z.string().trim().min(1,'Este campo es obligatorio').max(max,`Máximo ${max} caracteres`);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Selecciona una fecha').refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Fecha inválida');
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Selecciona una hora');
export const transferInputSchema=z.object({
 reservation:clean(60),holder:clean(),phone:z.string().trim().regex(/^\+?[\d\s()-]{7,25}$/,'Escribe un teléfono válido'),advisor:clean(),destination:z.enum(DESTINATIONS),hotel:clean(180),passengers:z.number().int().min(1,'Debe viajar al menos una persona mayor de 2 años').max(100),infants:z.number().int().min(0).max(30),arrivalAirline:clean(80),arrivalFlight:clean(30),arrivalDate:date,arrivalTime:time,returnAirline:clean(80),returnFlight:clean(30),returnDate:date,returnTime:time,includesTours:z.boolean(),tourNotes:z.string().trim().max(1500),notes:z.string().trim().max(2000)
}).strict().superRefine((v,ctx)=>{
 if(`${v.returnDate}T${v.returnTime}`<`${v.arrivalDate}T${v.arrivalTime}`)ctx.addIssue({code:'custom',path:['returnDate'],message:'El regreso debe ser posterior a la llegada'});
 if(v.includesTours&&!v.tourNotes)ctx.addIssue({code:'custom',path:['tourNotes'],message:'Describe los tours incluidos'});
});
export type TransferInput=z.infer<typeof transferInputSchema>;
export type TransferStatus=typeof STATUSES[number];
export type Transfer=TransferInput&{id:string;status:TransferStatus;createdAt:string;updatedAt:string;version:number};
export type TransferEvent={id:string;action:string;createdAt:string};
export type Provider={destination:typeof DESTINATIONS[number];name:string;channel:'email'|'whatsapp';contact:string};
export const DEFAULT_PROVIDERS:Provider[]=[
 {destination:'Cartagena',name:'Transturismo Cartagena',channel:'email',contact:'transturismocartagena@gmail.com'},
 {destination:'Santa Marta',name:'Taxi Marino',channel:'email',contact:'comercial@taximarino.com, reservas@taximarino.com'},
 {destination:'San Andrés',name:'Portofino Caribe',channel:'email',contact:'receptivos@portofinocaribe.com'},
 {destination:'Palomino',name:'Contacto de traslados Palomino',channel:'whatsapp',contact:'573235760342'},
 {destination:'Barú',name:'Comunicaciones aVioa',channel:'email',contact:'comunicacionesavioa@gmail.com'}
];
export const providerSchema=z.object({destination:z.enum(DESTINATIONS),name:clean(),channel:z.enum(['email','whatsapp']),contact:clean(350)}).strict().superRefine((v,ctx)=>{
 const ok=v.channel==='email'?v.contact.split(',').every(s=>z.string().email().safeParse(s.trim()).success):/^\+?\d{10,15}$/.test(v.contact);
 if(!ok)ctx.addIssue({code:'custom',path:['contact'],message:v.channel==='email'?'Separa los correos válidos con comas':'Usa un número internacional de 10 a 15 dígitos'});
});
export function providerMessage(t:TransferInput){return `Cordial saludo.\nDesde la agencia de viajes aVioa solicitamos su apoyo con la gestión del siguiente servicio de traslado.\n\nTitular de la reserva: ${t.holder}\nTeléfono: ${t.phone}\nAsesor: ${t.advisor}\nNúmero de reserva iTraffic: ${t.reservation}\nDestino: ${t.destination}\nHotel: ${t.hotel}\nPasajeros mayores de 2 años: ${t.passengers}\nInfantes de 0 a 2 años: ${t.infants}\n\nLLEGADA\nAerolínea: ${t.arrivalAirline}\nVuelo: ${t.arrivalFlight}\nFecha: ${t.arrivalDate}\nHora local del destino: ${t.arrivalTime}\n\nREGRESO\nAerolínea: ${t.returnAirline}\nVuelo: ${t.returnFlight}\nFecha: ${t.returnDate}\nHora local del destino: ${t.returnTime}\n\nIncluye tours: ${t.includesTours?'Sí':'No'}${t.includesTours?'\nTours: '+t.tourNotes:''}${t.notes?'\nObservaciones: '+t.notes:''}\n\nEstaremos atentos a su respuesta. Muchas gracias.`;}
export function legacyPayload(t:TransferInput){return {'Marca temporal':new Date().toISOString(),'Número de reserva iTraffic':t.reservation,'Titular de la reserva':t.holder,'Teléfono titular de la reserva':t.phone,'Asesor':t.advisor,'Destino':t.destination,'Hotel':t.hotel,'Cantidad de personas mayores a 2 años':String(t.passengers),'Cantidad de infantes (0 a 2 años)':String(t.infants),'Aerolínea de llegada':t.arrivalAirline,'Número de vuelo de llegada':t.arrivalFlight,'Fecha de llegada':t.arrivalDate,'Hora de llegada':t.arrivalTime,'Aerolínea de regreso':t.returnAirline,'Número de vuelo de regreso':t.returnFlight,'Fecha de regreso':t.returnDate,'Hora de regreso ':t.returnTime,'Incluye tours':t.includesTours?'Sí':'No','Observaciones tours':t.tourNotes,'Observaciones':t.notes};}
