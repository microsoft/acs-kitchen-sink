using Azure.Communication.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace acs_kitchen_sink.Controllers
{
    [ApiController]
    [Route("Identity")]
    public class IdentityController : ControllerBase
    {
        private readonly CommunicationIdentityClient _client;

        public IdentityController(CommunicationIdentityClient client)
        {
            _client = client;
        }

        [HttpGet]
        public async Task<ActionResult<CommunicationUserIdentifierAndToken>> GetIdentityAsync()
        {
            var identityResponse = await _client.CreateUserAndTokenAsync(scopes: new[] {
                CommunicationTokenScope.VoIP,
                CommunicationTokenScope.Chat
            });

            return Ok(identityResponse);
        }
    }
}
