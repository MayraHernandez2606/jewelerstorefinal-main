import { factories } from '@strapi/strapi';

/**
 * El controlador ahora usa la sintaxis moderna de importación (ESM/TS)
 * y la lógica para asignar el ID del usuario al campo 'cliente'.
 */
export default factories.createCoreController('api::pedido.pedido', ({ strapi }) => ({
    async create(ctx) {
        // 1. Obtener el ID del usuario logueado
        const { id } = ctx.state.user;
        // 2. Obtener los datos del pedido que viene del frontend
        const { data } = ctx.request.body;

        if (!id) {
            return ctx.unauthorized('Debes iniciar sesión para finalizar el pedido.');
        }

        // 3. Inyectar el ID del usuario en el payload antes de guardar
        const dataWithUser = {
            ...data,
            cliente: id, // Asignación de ID
        };

        // 4. Usar Entity Service para crear el pedido con el usuario asignado
        const entry = await strapi.entityService.create('api::pedido.pedido', {
            data: dataWithUser,
        });

        // 5. Devolver la respuesta en el formato estándar de Strapi
        const sanitizedEntry = await this.sanitizeOutput(entry, ctx);
        return { data: sanitizedEntry };
    },
}));